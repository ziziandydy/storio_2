import { detectBot } from '@/lib/botDetection';
import { getApiUrl } from '@/lib/api';
import { supabase } from '@/lib/supabase';

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

/** 同主體＋事件＋UTC 日只送一次；送出前先寫 key（防同 tick 重複），失敗時由呼叫端移除 */
function dedupeKey(event: ClientEvent, subject: string): string {
  return `storio_evt_${event}_${subject}`;
}

function alreadySentToday(key: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(key) === today) return true;
    localStorage.setItem(key, today);
  } catch {
    // 忽略，寧可多送（後端也會去重）
  }
  return false;
}

function clearKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略
  }
}

async function send(event: ClientEvent): Promise<void> {
  const bot = detectBot();
  if (bot.reason === 'render_service') return;

  // getSession 遇過期 token 會先刷新，避免回前景時帶舊 token
  const { data } = await supabase.auth.getSession();
  const session = data?.session;
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let body: Record<string, unknown> = { event };
  let subject: string;

  if (token) {
    subject = session?.user?.id ?? 'user';
    headers.Authorization = `Bearer ${token}`;
  } else if (event === 'open') {
    subject = getVisitorId();
    body = { event, visitor_id: subject, is_suspected_bot: bot.isBot };
    if (bot.reason === 'user_agent' || bot.reason === 'webdriver') body.bot_reason = bot.reason;
  } else {
    return;
  }

  const key = dedupeKey(event, subject);
  if (alreadySentToday(key)) return;

  try {
    const res = await fetch(getApiUrl('/api/v1/events'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) clearKey(key); // 失敗不算已送，不重試
  } catch {
    clearKey(key);
  }
}

/** 上報互動事件；不回 Promise、永不丟例外、不阻塞 UI */
export function track(event: ClientEvent): void {
  send(event).catch(() => {});
}
