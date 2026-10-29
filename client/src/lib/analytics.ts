import { detectBot } from '@/lib/botDetection';
import { getApiUrl } from '@/lib/api';
import { useUserStore } from '@/store/userStore';

export type ClientEvent = 'open' | 'browse' | 'detail_view' | 'search' | 'share';

const VISITOR_KEY = 'storio_visitor_id';
let memoryVisitorId: string | null = null;

/** 取得（或建立）匿名訪客 ID；storage 不可用時退回模組層記憶體值 */
export function getVisitorId(): string {
  try {
    const stored = localStorage.getItem(VISITOR_KEY);
    if (stored) return stored;
  } catch {
    // storage 不可用，改用記憶體值
  }
  if (!memoryVisitorId) memoryVisitorId = crypto.randomUUID();
  try {
    localStorage.setItem(VISITOR_KEY, memoryVisitorId);
  } catch {
    // 忽略
  }
  return memoryVisitorId;
}

/** 同主體＋事件＋UTC 日只送一次；送出前先寫 key。storage 失敗時視為未送過 */
function alreadySentToday(event: ClientEvent, subject: string): boolean {
  const key = `storio_evt_${event}_${subject}`;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(key) === today) return true;
    localStorage.setItem(key, today);
  } catch {
    // 忽略，寧可多送（後端也會去重）
  }
  return false;
}

/** 上報互動事件；不回 Promise、永不丟例外 */
export function track(event: ClientEvent): void {
  try {
    const bot = detectBot();
    if (bot.reason === 'render_service') return;

    const { token, user } = useUserStore.getState();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: Record<string, unknown> = { event };
    let subject: string;

    if (token) {
      subject = user?.id ?? 'user';
      headers.Authorization = `Bearer ${token}`;
    } else if (event === 'open') {
      subject = getVisitorId();
      body = { event, visitor_id: subject, is_suspected_bot: bot.isBot };
      if (bot.reason === 'user_agent' || bot.reason === 'webdriver') body.bot_reason = bot.reason;
    } else {
      return;
    }

    if (alreadySentToday(event, subject)) return;

    fetch(getApiUrl('/api/v1/events'), {
      method: 'POST',
      keepalive: true,
      headers,
      body: JSON.stringify(body),
    }).catch(() => {});
  } catch {
    // 上報失敗一律靜默
  }
}
