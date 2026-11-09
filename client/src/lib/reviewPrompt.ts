import { isIOSPlatform } from '@/lib/appleAuth';

/**
 * iOS 系統評價視窗（SKStoreReviewController）。
 *
 * 流程分兩段：
 * - `armReviewPrompt`：儲存成功當下判定資格，合格就在模組變數登記 pending。
 * - `flushReviewPrompt`：成功視窗關閉時呼叫，若有 pending 就以模組層級的 setTimeout 在 1.5 秒後呼叫外掛。
 *
 * 計時器刻意放在模組層級而非 React effect：用戶點「前往 My Storio」會 router.push 讓 modal 卸載，
 * effect 的計時器會被清掉，評價視窗就永遠不會出現。
 */

const STORAGE_KEY = 'storio_review_prompt_at';
const DAY_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_AGE_MS = 30 * DAY_MS;
const THROTTLE_MS = 90 * DAY_MS;
const DELAY_MS = 1500;

export interface ReviewPromptInput {
  isAnonymous: boolean;
  accountCreatedAt: string | null;
  totalCount: number | null;
  celebrated: boolean;
}

let pending = false;

/** 讀上次呼叫時間；localStorage 不可用或值無效時回傳 null（視為未節流） */
function readLastPromptAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeLastPromptAt(ts: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(ts));
  } catch {
    // 寫入失敗不影響流程
  }
}

function isEligible(input: ReviewPromptInput): boolean {
  if (input.isAnonymous || input.celebrated) return false;
  if (!isIOSPlatform()) return false;

  const now = Date.now();
  const createdAt = input.accountCreatedAt ? Date.parse(input.accountCreatedAt) : NaN;
  const oldEnough = Number.isFinite(createdAt) && now - createdAt >= ACCOUNT_AGE_MS;
  const enoughItems = typeof input.totalCount === 'number' && input.totalCount >= 2;
  if (!oldEnough && !enoughItems) return false;

  const last = readLastPromptAt();
  if (last !== null && now - last < THROTTLE_MS) return false;
  return true;
}

/** 儲存成功當下呼叫：合格則登記 pending（覆蓋前一次），不合格則清掉先前的 pending */
export function armReviewPrompt(input: ReviewPromptInput): void {
  pending = isEligible(input);
}

/** 成功視窗關閉時呼叫：有 pending 才排程，排程後立即清掉，重複呼叫不會重複觸發 */
export function flushReviewPrompt(): void {
  if (!pending) return;
  pending = false;
  setTimeout(() => {
    writeLastPromptAt(Date.now());
    void requestReview();
  }, DELAY_MS);
}

async function requestReview(): Promise<void> {
  try {
    // 動態載入，避免網頁 bundle 帶入原生外掛
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  } catch {
    // 外掛不可用或呼叫失敗：靜默略過
  }
}
