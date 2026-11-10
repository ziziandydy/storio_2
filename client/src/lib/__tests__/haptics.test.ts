import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const m = vi.hoisted(() => ({
  native: true,
  notification: vi.fn(),
}));

vi.mock('@/lib/appleAuth', () => ({ isNativePlatform: () => m.native }));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { notification: (...args: unknown[]) => m.notification(...args) },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

import { playSuccessHaptics } from '@/lib/haptics';

describe('playSuccessHaptics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    m.native = true;
    m.notification.mockReset();
    m.notification.mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it('原生平台：連兩下 SUCCESS，間隔約 120ms', async () => {
    const p = playSuccessHaptics();
    await vi.advanceTimersByTimeAsync(0);
    expect(m.notification).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(119);
    expect(m.notification).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(m.notification).toHaveBeenCalledTimes(2);
    expect(m.notification).toHaveBeenNthCalledWith(1, { type: 'SUCCESS' });
    expect(m.notification).toHaveBeenNthCalledWith(2, { type: 'SUCCESS' });
  });

  it('網頁：完全不呼叫', async () => {
    m.native = false;
    const p = playSuccessHaptics();
    await vi.advanceTimersByTimeAsync(500);
    await p;
    expect(m.notification).not.toHaveBeenCalled();
  });

  it('外掛拋錯：吞掉，不往外丟', async () => {
    m.notification.mockRejectedValue(new Error('not implemented'));
    const p = playSuccessHaptics();
    await vi.advanceTimersByTimeAsync(500);
    await expect(p).resolves.toBeUndefined();
  });
});
