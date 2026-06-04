'use client';

import { LocalNotifications } from '@capacitor/local-notifications';
import { NOTIFICATION_CONFIG, MESSAGE_VARIANTS } from './notification-config';
import { isNativePlatform } from './appleAuth';
import { getApiUrl } from './api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NotificationState {
  username: string;
  lastTitle: string | null;
  lastMediaType: 'movie' | 'book' | 'tv' | null;
  daysSinceLastLog: number;
  collectionCount: number;
  hasUnratedItemsWithin14Days: boolean;
  daysSinceLastReflection: number;
  language: 'zh-TW' | 'en-US';
  notifEnabled: boolean;
  notifLogStory: boolean;
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
export function getOptimalHour(type: 'log_story' | 'folio_reflection'): number {
  const fallback = type === 'log_story'
    ? NOTIFICATION_CONFIG.LOG_STORY_FALLBACK_HOUR
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

// ─── Notification Content ────────────────────────────────────────────────────

function mediaEmoji(type: 'movie' | 'book' | 'tv' | null): string {
  if (type === 'movie') return '🎬';
  if (type === 'book') return '📚';
  if (type === 'tv') return '📺';
  return '📚';
}

function randomVariant(language: 'zh-TW' | 'en-US'): string {
  const variants = MESSAGE_VARIANTS[language] ?? MESSAGE_VARIANTS['en-US'];
  return variants[Math.floor(Math.random() * variants.length)];
}

function buildLogStoryContent(state: NotificationState): { title: string; body: string } {
  const isChinese = state.language === 'zh-TW';
  if (state.lastTitle && state.daysSinceLastLog > 0) {
    return {
      title: isChinese ? 'Storio' : 'Storio',
      body: isChinese
        ? `${state.username}，${state.daysSinceLastLog} 天沒有新典藏了 ${mediaEmoji(state.lastMediaType)}`
        : `${state.username}, it's been ${state.daysSinceLastLog} days since your last story ${mediaEmoji(state.lastMediaType)}`,
    };
  }
  return {
    title: isChinese ? 'Storio' : 'Storio',
    body: randomVariant(state.language),
  };
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

function applyBlackout(hour: number): number {
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

const STORIO_NOTIF_ID_LOG_STORY = 1001;
const STORIO_NOTIF_ID_FOLIO = 1002;

/**
 * 主排程函式。每次 App Open Reset 時呼叫。
 * 取消現有通知 → 判斷觸發條件 → 排程最多 MAX_PER_DAY 則。
 */
export async function reschedule(state: NotificationState): Promise<void> {
  if (!isNativePlatform()) return;
  if (!state.notifEnabled) {
    await cancelAll();
    return;
  }

  const { IGNORE_THRESHOLD, MAX_PER_DAY, LOG_STORY_INTERVAL_DAYS,
    FOLIO_REFLECTION_INTERVAL_DAYS, UNRATED_RECENT_WINDOW_DAYS,
    UNRATED_COOLDOWN_DAYS } = NOTIFICATION_CONFIG;

  // 檢查權限
  const { display } = await LocalNotifications.checkPermissions();
  if (display !== 'granted') return;

  await cancelAll();

  const toSchedule: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = [];
  const now = Date.now();

  // ── Log a story ──────────────────────────────────────────────────────────
  if (state.notifLogStory) {
    const logState = getTriggerState('log_story');
    const shouldSkip = logState.ignoredCount >= IGNORE_THRESHOLD;
    const intervalOk = state.daysSinceLastLog >= LOG_STORY_INTERVAL_DAYS;

    if (!shouldSkip && intervalOk) {
      const rawHour = getOptimalHour('log_story');
      const hour = applyBlackout(rawHour);
      const at = nextScheduleDate(hour, NOTIFICATION_CONFIG.LOG_STORY_FALLBACK_MINUTE);
      const { title, body } = buildLogStoryContent(state);
      toSchedule.push({
        id: STORIO_NOTIF_ID_LOG_STORY,
        title,
        body,
        schedule: { at },
        extra: { storio: true, trigger: 'log_story' },
        sound: undefined,
        actionTypeId: '',
        attachments: undefined,
        channelId: undefined,
      });
      saveTriggerState('log_story', { ...logState, lastSentAt: now });
    }
  }

  // ── Folio reflection ─────────────────────────────────────────────────────
  if (state.notifFolioReflection && toSchedule.length < MAX_PER_DAY) {
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
  notifLogStory: boolean,
  notifFolioReflection: boolean,
): Promise<NotificationState> {
  const today = Date.now();
  const defaultState: NotificationState = {
    username,
    lastTitle: null,
    lastMediaType: null,
    daysSinceLastLog: 0,
    collectionCount: 0,
    hasUnratedItemsWithin14Days: false,
    daysSinceLastReflection: 0,
    language,
    notifEnabled,
    notifLogStory,
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
    const daysSinceLastLog = Math.floor(
      (today - new Date(latest.created_at).getTime()) / 86400000
    );

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
      lastMediaType: latest.media_type,
      daysSinceLastLog,
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
