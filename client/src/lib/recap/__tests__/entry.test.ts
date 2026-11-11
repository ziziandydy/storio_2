// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { recapWindowYear, dismissKey, isDismissed, dismiss } from '../entry';

// 本地日期（月份從 0 起算）
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('recapWindowYear', () => {
  it.each([
    [d(2026, 10, 31), null],
    [d(2026, 11, 1), 2026],
    [d(2026, 12, 31), 2026],
    [d(2027, 1, 1), 2026],
    [d(2027, 2, 28), 2026],
    [d(2028, 2, 29), 2027],
    [d(2027, 3, 1), null],
    [d(2026, 7, 15), null],
  ])('%s → %s', (date, expected) => {
    expect(recapWindowYear(date)).toBe(expected);
  });
});

describe('關閉狀態（localStorage）', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('dismissKey 以年份命名', () => {
    expect(dismissKey(2026)).toBe('storio_recap_dismissed_2026');
  });

  it('關閉 2026 不影響 2027', () => {
    expect(isDismissed(2026)).toBe(false);
    dismiss(2026);
    expect(isDismissed(2026)).toBe(true);
    expect(isDismissed(2027)).toBe(false);
  });

  it('localStorage 讀取拋例外時 isDismissed 回 false（每次顯示）', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(isDismissed(2026)).toBe(false);
  });

  it('localStorage 寫入拋例外時 dismiss 不報錯', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => dismiss(2026)).not.toThrow();
  });
});
