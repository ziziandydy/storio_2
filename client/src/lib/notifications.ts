'use client';

import { LocalNotifications } from '@capacitor/local-notifications';
import { NOTIFICATION_CONFIG, CHURN_TIERS, CHURN_MESSAGE_VARIANTS, ChurnTierKey } from './notification-config';
import { isNativePlatform } from './appleAuth';
import { getApiUrl } from './api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationState {
  username: string;
  lastTitle: string | null;
  collectionCount: number;
  hasUnratedItemsWithin14Days: boolean;
  daysSinceLastReflection: number;
  language: 'zh-TW' | 'en-US';
  notifEnabled: boolean;
  notifComeBack: boolean;
  notifFolioReflection: boolean;
}

interface EngagementEntry {
  hour: number;
  weight: number;
}

interface TriggerState {
  ignoredCount: number;
  lastSentAt: number | null;
}

const ENGAGEMENT_KEY = 'storio_notif_engagement_history';
const LAST_SCHEDULED_KEY = 'storio_notif_last_scheduled';
const TRIGGER_KEY = (name: string) => `storio_notif_trigger_${name}`;

// ─── Engagement History ──────────────────────────────────────────────────────

/**
 * 記錄使用者當前時段到 engagement history。
 * weight=1：app 開啟；weight=2：記錄 Storio（更強信號）。
 */
export function recordEngagement(weight: number): void {
  if (typeof window === 'undefined') return;
  try {
    const hour = new Date().getHours();
    const raw = localStorage.getItem(ENGAGEMENT_KEY);
    const history: EngagementEntry[] = raw ? JSON.parse(raw) : [];
    history.push({ hour, weight });
    // 滑動窗口：超過上限時移除最舊
    while (history.length > NOTIFICATION_CONFIG.ENGAGEMENT_HISTORY_MAX) {
      history.shift();
    }
    localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(history));
  } catch {
    // localStorage 不可用時靜默略過
  }
}

/**
 * 根據 engagement history 計算最佳排程小時。
 * 資料不足時返回 fallback。
 */
export function getOptimalHour(type: 'come_back' | 'folio_reflection'): number {
  const fallback = type === 'come_back'
    ? NOTIFICATION_CONFIG.COME_BACK_FALLBACK_HOUR
    : NOTIFICATION_CONFIG.FOLIO_REFLECTION_FALLBACK_HOUR;

  try {
    const raw = localStorage.getItem(ENGAGEMENT_KEY);
    if (!raw) return fallback;
    const history: EngagementEntry[] = JSON.parse(raw);
    if (history.length < NOTIFICATION_CONFIG.MIN_DATA_POINTS_FOR_LEARNING) return fallback;

    // 加權頻率統計
    const freq = new Array(24).fill(0);
    history.forEach(({ hour, weight }) => { freq[hour] += weight; });

    // 找各時段峰值
    const { PEAK_EVENING_START, PEAK_EVENING_END, PEAK_MORNING_START, PEAK_MORNING_END, BLACKOUT_END_HOUR } = NOTIFICATION_CONFIG;

    const bestInRange = (start: number, end: number): { hour: number; score: number } | null => {
      let best: { hour: number; score: number } | null = null;
      for (let h = start; h <= end; h++) {
        if (!best || freq[h] > best.score) best = { hour: h, score: freq[h] };
      }
      return best && best.score > 0 ? best : null;
    };

    const eveningPeak = bestInRange(PEAK_EVENING_START, PEAK_EVENING_END);
    const morningPeak = bestInRange(PEAK_MORNING_START, PEAK_MORNING_END);
    const chosen = (eveningPeak ?? morningPeak)?.hour ?? fallback;

    // Blackout 推延
    if (chosen < BLACKOUT_END_HOUR) return BLACKOUT_END_HOUR;
    return chosen;
  } catch {
    return fallback;
  }
}

// ─── Trigger State (ignoredCount / lastSentAt) ───────────────────────────────

function getTriggerState(trigger: string): TriggerState {
  try {
    const raw = localStorage.getItem(TRIGGER_KEY(trigger));
    return raw ? JSON.parse(raw) : { ignoredCount: 0, lastSentAt: null };
  } catch {
    return { ignoredCount: 0, lastSentAt: null };
  }
}

function saveTriggerState(trigger: string, state: TriggerState): void {
  try {
    localStorage.setItem(TRIGGER_KEY(trigger), JSON.stringify(state));
  } catch {
    // 靜默略過
  }
}

/** 連續未回應時遞增 ignoredCount（App Open Reset 呼叫）。 */
export function incrementIgnoredCount(trigger: string): void {
  const state = getTriggerState(trigger);
  saveTriggerState(trigger, { ...state, ignoredCount: state.ignoredCount + 1 });
}

/** 使用者主動行動時重置 ignoredCount。 */
export function resetIgnoredCount(trigger: string): void {
  const state = getTriggerState(trigger);
  saveTriggerState(trigger, { ...state, ignoredCount: 0 });
}

// ─── Permission ──────────────────────────────────────────────────────────────

/** 檢查並請求通知權限，返回是否已授予。 */
export async function checkAndRequestPermission(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    let { display } = await LocalNotifications.checkPermissions();
    if (display === 'prompt' || display === 'prompt-with-rationale') {
      const result = await LocalNotifications.requestPermissions();
      display = result.display;
    }
    return display === 'granted';
  } catch {
    return false;
  }
}

// ─── Interpolate ──────────────────────────────────────────────────────────

export interface InterpolateVars {
  username: string;
  collectionCount: number;
  lastTitle: string | null;
}

/**
 * 將文案模板中的 {username}/{collectionCount}/{lastTitle} 代入實際值。
 * {username} 為空時移除開頭的「{username}，」/「{username}, 」前綴（含標點與空白）。
 * 模板需要 {lastTitle} 但值不存在時回傳 null，呼叫端應排除該變體。
 */
export function interpolate(template: string, vars: InterpolateVars): string | null {
  if (template.includes('{lastTitle}') && !vars.lastTitle) return null;

  let result = template;
  if (!vars.username) {
    result = result.replace(/^\{username\}[，,]\s*/, '');
  } else {
    result = result.replace(/\{username\}/g, vars.username);
  }
  result = result.replace(/\{collectionCount\}/g, String(vars.collectionCount));
  if (vars.lastTitle) {
    result = result.replace(/\{lastTitle\}/g, vars.lastTitle);
  }
  return result;
}

// ─── Notification Content ────────────────────────────────────────────────────

function buildComeBackContent(tierKey: ChurnTierKey, state: NotificationState): { title: string; body: string } | null {
  const pool = CHURN_MESSAGE_VARIANTS[state.language]?.[tierKey] ?? CHURN_MESSAGE_VARIANTS['en-US'][tierKey];
  const candidates = pool
    .map((template) => interpolate(template, {
      username: state.username,
      collectionCount: state.collectionCount,
      lastTitle: state.lastTitle,
    }))
    .filter((body): body is string => body !== null);

  if (candidates.length === 0) return null;
  const body = candidates[Math.floor(Math.random() * candidates.length)];
  return { title: 'Storio', body };
}

function buildFolioReflectionContent(state: NotificationState): { title: string; body: string } {
  const isChinese = state.language === 'zh-TW';
  if (state.lastTitle) {
    return {
      title: isChinese ? 'Folio Reflection' : 'Folio Reflection',
      body: isChinese
        ? `《${state.lastTitle}》給你什麼感悟？🌙`
        : `What did you think of "${state.lastTitle}"? 🌙`,
    };
  }
  return {
    title: isChinese ? 'Folio Reflection' : 'Folio Reflection',
    body: isChinese ? '你的故事等待你的感悟' : 'Your stories are waiting for your thoughts',
  };
}

// ─── Schedule Helpers ────────────────────────────────────────────────────────

function nextScheduleDate(hour: number, minute: number): Date {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  // 若今天這個時間已過，排到明天
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

/**
 * 計算「距現在 daysFromNow 天後」的目標日期，套用指定時分。
 * 與 nextScheduleDate 不同：不判斷「今天是否已過」，永遠是未來日期
 * （churn-rescue 階梯的 daysFromNow 恆 ≥ 3，不會發生同日情況）。
 */
function futureScheduleDate(daysFromNow: number, hour: number, minute: number): Date {
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  target.setHours(hour, minute, 0, 0);
  return target;
}

export function applyBlackout(hour: number): number {
  const { BLACKOUT_START_HOUR, BLACKOUT_END_HOUR } = NOTIFICATION_CONFIG;
  if (hour >= BLACKOUT_START_HOUR && hour < BLACKOUT_END_HOUR) {
    return BLACKOUT_END_HOUR;
  }
  return hour;
}

// ─── Cancel All ──────────────────────────────────────────────────────────────

/** 取消所有 Storio 管理的 pending 通知。 */
export async function cancelAll(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    const { notifications } = await LocalNotifications.getPending();
    const storioIds = notifications
      .filter(n => n.extra?.storio === true)
      .map(n => ({ id: n.id }));
    if (storioIds.length > 0) {
      await LocalNotifications.cancel({ notifications: storioIds });
    }
  } catch {
    // 靜默略過
  }
}

// ─── Reschedule ──────────────────────────────────────────────────────────────

const CHURN_NOTIF_ID_BASE = 2001; // CHURN_TIERS[0..6] → 2001–2007
const STORIO_NOTIF_ID_FOLIO = 1002;

/**
 * 主排程函式。每次 App Open Reset 時呼叫。
 * Come back：notifComeBack 為 true 時，一次預排 CHURN_TIERS 全部 7 則未來日期通知
 *   （now + tier.days 天，各自的 optimal hour）。取代舊有「條件達標才排今晚」的反應式邏輯。
 * Folio reflection：邏輯不變，獨立判斷是否排程，不受 come back 佔用 toSchedule 陣列長度影響。
 */
export async function reschedule(state: NotificationState): Promise<void> {
  if (!isNativePlatform()) return;
  if (!state.notifEnabled) {
    await cancelAll();
    return;
  }

  const { UNRATED_COOLDOWN_DAYS, FOLIO_REFLECTION_INTERVAL_DAYS, IGNORE_THRESHOLD } = NOTIFICATION_CONFIG;

  // 檢查權限
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return;

  await cancelAll();

  const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];
  const now = Date.now();

  // ── Come back（churn-rescue 階梯）──────────────────────────────────────
  if (state.notifComeBack) {
    CHURN_TIERS.forEach((tier, index) => {
      const rawHour = getOptimalHour('come_back');
      const hour = applyBlackout(rawHour);
      const at = futureScheduleDate(tier.days, hour, NOTIFICATION_CONFIG.COME_BACK_FALLBACK_MINUTE);
      const content = buildComeBackContent(tier.key, state);
      if (!content) return;

      toSchedule.push({
        id: CHURN_NOTIF_ID_BASE + index,
        title: content.title,
        body: content.body,
        schedule: { at },
        extra: { storio: true, trigger: 'come_back', tier: tier.key },
        sound: undefined,
        actionTypeId: '',
        attachments: undefined,
        channelId: undefined,
      });
    });
  }

  // ── Folio reflection（獨立排程，不受 come back 佔用 toSchedule 影響）────
  if (state.notifFolioReflection) {
    const folioState = getTriggerState('folio_reflection');
    const shouldSkip = folioState.ignoredCount >= IGNORE_THRESHOLD;

    // 主觸發：14 天內未評分
    const cooldownOk = !folioState.lastSentAt ||
      (now - folioState.lastSentAt) > UNRATED_COOLDOWN_DAYS * 86400000;
    const primaryTrigger = state.hasUnratedItemsWithin14Days && cooldownOk;

    // 次觸發：心得逾期
    const secondaryTrigger = state.daysSinceLastReflection >= FOLIO_REFLECTION_INTERVAL_DAYS;

    if (!shouldSkip && (primaryTrigger || secondaryTrigger)) {
      const rawHour = getOptimalHour('folio_reflection');
      const hour = applyBlackout(rawHour);
      const at = nextScheduleDate(hour, NOTIFICATION_CONFIG.FOLIO_REFLECTION_FALLBACK_MINUTE);
      const { title, body } = buildFolioReflectionContent(state);
      toSchedule.push({
        id: STORIO_NOTIF_ID_FOLIO,
        title,
        body,
        schedule: { at },
        extra: { storio: true, trigger: 'folio_reflection' },
        sound: undefined,
        actionTypeId: '',
        attachments: undefined,
        channelId: undefined,
      });
      saveTriggerState('folio_reflection', { ...folioState, lastSentAt: now });
    }
  }

  if (toSchedule.length > 0) {
    await LocalNotifications.schedule({ notifications: toSchedule });
    try {
      localStorage.setItem(LAST_SCHEDULED_KEY, String(now));
    } catch {
      // 靜默略過
    }
  }
}

// ─── Fetch State from API ─────────────────────────────────────────────────────

/**
 * 從 API 讀取排程所需的用戶狀態。
 * 供 layout.tsx App Open Reset 呼叫。
 */
export async function fetchNotificationState(
  token: string,
  username: string,
  language: 'zh-TW' | 'en-US',
  notifEnabled: boolean,
  notifComeBack: boolean,
  notifFolioReflection: boolean,
): Promise<NotificationState> {
  const today = Date.now();
  const defaultState: NotificationState = {
    username,
    lastTitle: null,
    collectionCount: 0,
    hasUnratedItemsWithin14Days: false,
    daysSinceLastReflection: 0,
    language,
    notifEnabled,
    notifComeBack,
    notifFolioReflection,
  };

  try {
    const res = await fetch(getApiUrl('/api/v1/collection'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return defaultState;
    const data = await res.json();

    // 支援 { groups: [...] } 或直接 array
    const items: Array<{
      title: string;
      media_type: 'movie' | 'book' | 'tv';
      created_at: string;
      rating: number;
      notes?: string;
    }> = Array.isArray(data) ? data : (data.groups ?? []).flatMap((g: { instances?: unknown[] }) => g.instances ?? []);

    if (items.length === 0) return defaultState;

    // 按 created_at 排序，最新在前
    const sorted = [...items].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0];

    // 未評分 14 天內
    const window14 = today - NOTIFICATION_CONFIG.UNRATED_RECENT_WINDOW_DAYS * 86400000;
    const hasUnrated = items.some(
      (i) => i.rating === 0 && new Date(i.created_at).getTime() > window14
    );

    // 距上次有 notes 的記錄
    const lastWithNotes = sorted.find((i) => i.notes && i.notes.trim().length > 0);
    const daysSinceLastReflection = lastWithNotes
      ? Math.floor((today - new Date(lastWithNotes.created_at).getTime()) / 86400000)
      : 999;

    return {
      ...defaultState,
      lastTitle: latest.title,
      collectionCount: items.length,
      hasUnratedItemsWithin14Days: hasUnrated,
      daysSinceLastReflection,
    };
  } catch {
    return defaultState;
  }
}

export const notificationManager = {
  reschedule,
  cancelAll,
  checkAndRequestPermission,
  recordEngagement,
  getOptimalHour,
  incrementIgnoredCount,
  resetIgnoredCount,
  fetchNotificationState,
};
