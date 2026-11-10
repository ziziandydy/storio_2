// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({
  ios: true,
  requestReview: vi.fn(),
}));

vi.mock('@/lib/appleAuth', () => ({ isIOSPlatform: () => m.ios }));
const pluginFactory = vi.hoisted(() => () => ({
  InAppReview: { requestReview: (...a: unknown[]) => m.requestReview(...a) },
}));
vi.mock('@capacitor-community/in-app-review', pluginFactory);

const KEY = 'storio_review_prompt_at';
const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-09T12:00:00Z').getTime();

type Mod = typeof import('../reviewPrompt');
let mod: Mod;

/** 每個測試重新載入模組，確保模組層級的 pending 狀態不互相污染 */
async function load() {
  vi.resetModules();
  mod = await import('../reviewPrompt');
}

/** 推進假時間，並讓動態 import 與 requestReview 的 promise 有機會完成 */
async function advance(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

const base = {
  isAnonymous: false,
  accountCreatedAt: new Date(NOW - 31 * DAY).toISOString(),
  totalCount: 1 as number | null,
  celebrated: false,
};

describe('reviewPrompt', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(NOW);
    m.ios = true;
    vi.doMock('@capacitor-community/in-app-review', pluginFactory);
    m.requestReview.mockReset().mockResolvedValue(undefined);
    localStorage.clear();
    await load();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('已登入＋帳號滿 30 天 → flush 後 1500ms 才呼叫（arm 時與 1499ms 皆不呼叫）', async () => {
    mod.armReviewPrompt(base);
    await advance(5000);
    expect(m.requestReview).not.toHaveBeenCalled();
    mod.flushReviewPrompt();
    await advance(1499);
    expect(m.requestReview).not.toHaveBeenCalled();
    await advance(1);
    expect(m.requestReview).toHaveBeenCalledTimes(1);
    expect(Number(localStorage.getItem(KEY))).toBe(NOW + 5000 + 1500);
  });

  it('已登入＋totalCount>=2（帳號未滿 30 天）→ 呼叫', async () => {
    mod.armReviewPrompt({ ...base, accountCreatedAt: new Date(NOW - 2 * DAY).toISOString(), totalCount: 2 });
    mod.flushReviewPrompt();
    await advance(1500);
    expect(m.requestReview).toHaveBeenCalledTimes(1);
  });

  it('兩種情境皆不成立 → 不呼叫', async () => {
    mod.armReviewPrompt({ ...base, accountCreatedAt: new Date(NOW - 29 * DAY).toISOString(), totalCount: 1 });
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('created_at 為 null 或無效 → 不算年齡情境', async () => {
    mod.armReviewPrompt({ ...base, accountCreatedAt: null, totalCount: null });
    mod.flushReviewPrompt();
    mod.armReviewPrompt({ ...base, accountCreatedAt: 'not-a-date', totalCount: 1 });
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('訪客 → 不呼叫', async () => {
    mod.armReviewPrompt({ ...base, isAnonymous: true, totalCount: 5 });
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('當次播放了慶祝 → 不呼叫', async () => {
    mod.armReviewPrompt({ ...base, celebrated: true });
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('非 iOS → 不呼叫', async () => {
    m.ios = false;
    mod.armReviewPrompt(base);
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('90 天內已呼叫（60 天前）→ 不呼叫', async () => {
    localStorage.setItem(KEY, String(NOW - 60 * DAY));
    mod.armReviewPrompt(base);
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('超過 90 天（91 天前）→ 呼叫', async () => {
    localStorage.setItem(KEY, String(NOW - 91 * DAY));
    mod.armReviewPrompt(base);
    mod.flushReviewPrompt();
    await advance(1500);
    expect(m.requestReview).toHaveBeenCalledTimes(1);
  });

  it('不合格的 arm 會清掉先前的 pending', async () => {
    mod.armReviewPrompt(base);
    mod.armReviewPrompt({ ...base, celebrated: true });
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('requestReview 拋錯 → 吞掉，不產生 unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    m.requestReview.mockRejectedValue(new Error('boom'));
    mod.armReviewPrompt(base);
    mod.flushReviewPrompt();
    await advance(1500);
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 10));
    process.off('unhandledRejection', unhandled);
    expect(m.requestReview).toHaveBeenCalledTimes(1);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('外掛 import 失敗 → 吞掉，不產生 unhandled rejection', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    vi.doMock('@capacitor-community/in-app-review', () => {
      throw new Error('plugin unavailable');
    });
    await load();
    mod.armReviewPrompt(base);
    mod.flushReviewPrompt();
    await advance(1500);
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 10));
    process.off('unhandledRejection', unhandled);
    expect(m.requestReview).not.toHaveBeenCalled();
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('呼叫端（modal）卸載後計時器仍觸發：arm＋flush 之後不再有任何呼叫', async () => {
    // 模擬 modal：只在儲存成功與關閉時呼叫，之後即卸載，不再參與
    const fakeModal = { save: () => mod.armReviewPrompt(base), close: () => mod.flushReviewPrompt() };
    fakeModal.save();
    fakeModal.close();
    await advance(1500);
    expect(m.requestReview).toHaveBeenCalledTimes(1);
  });

  it('沒有 arm 就 flush → 不呼叫', async () => {
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).not.toHaveBeenCalled();
  });

  it('連續 flush 兩次 → 只呼叫一次', async () => {
    mod.armReviewPrompt(base);
    mod.flushReviewPrompt();
    mod.flushReviewPrompt();
    await advance(1500);
    mod.flushReviewPrompt();
    await advance(3000);
    expect(m.requestReview).toHaveBeenCalledTimes(1);
  });

  it('localStorage 讀寫拋錯 → 視為未節流，仍呼叫且不拋錯', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => mod.armReviewPrompt(base)).not.toThrow();
    mod.flushReviewPrompt();
    await advance(1500);
    expect(m.requestReview).toHaveBeenCalledTimes(1);
  });
});
