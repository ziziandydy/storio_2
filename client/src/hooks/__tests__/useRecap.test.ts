// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { makeRecap } from '@/lib/recap/__tests__/fixtures';

const auth = vi.hoisted(() => ({ current: { token: 'tok' as string | null, loading: false } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/lib/api', () => ({ getApiUrl: (p: string) => `http://api${p}` }));

import { useRecap, useRecapYears, clearRecapCache } from '../useRecap';
import { emitStoryAdded } from '@/lib/notification-events';

const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);

describe('useRecap', () => {
  beforeEach(() => {
    auth.current = { token: 'tok', loading: false };
    clearRecapCache();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('200 → ready，帶 Authorization 並請求對應年份', async () => {
    const f = vi.fn(() => json(200, makeRecap({ year: 2026 })));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useRecap(2026));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data?.year).toBe(2026);
    expect(f).toHaveBeenCalledWith('http://api/api/v1/collection/recap?year=2026', {
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('404 recap_not_enough → not_enough 並帶 needed', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(404, { detail: { code: 'recap_not_enough', needed: 2, count: 1 } })));
    const { result } = renderHook(() => useRecap(2026));
    await waitFor(() => expect(result.current.status).toBe('not_enough'));
    expect(result.current.needed).toBe(2);
    expect(result.current.data).toBeNull();
  });

  it('其他 404 → error（不是 not_enough）', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(404, { detail: 'Not Found' })));
    const { result } = renderHook(() => useRecap(2026));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('403 → forbidden', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(403, { detail: 'nope' })));
    const { result } = renderHook(() => useRecap(2026));
    await waitFor(() => expect(result.current.status).toBe('forbidden'));
  });

  it('500 與網路例外 → error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(500, {})));
    const first = renderHook(() => useRecap(2026));
    await waitFor(() => expect(first.result.current.status).toBe('error'));

    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
    const second = renderHook(() => useRecap(2026));
    await waitFor(() => expect(second.result.current.status).toBe('error'));
  });

  it('year 為 null 或沒有 token → idle 且不請求', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const noYear = renderHook(() => useRecap(null));
    expect(noYear.result.current.status).toBe('idle');

    auth.current = { token: null, loading: false };
    const noToken = renderHook(() => useRecap(2026));
    expect(noToken.result.current.status).toBe('idle');
    expect(f).not.toHaveBeenCalled();
  });

  it('loading：請求進行中', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { result } = renderHook(() => useRecap(2026));
    expect(result.current.status).toBe('loading');
  });

  it('metadata_pending > 0：4 秒後只自動重取一次（第二次仍 > 0 也不再重取）', async () => {
    vi.useFakeTimers();
    const f = vi.fn(() => json(200, makeRecap({ metadata_pending: 3 })));
    vi.stubGlobal('fetch', f);
    renderHook(() => useRecap(2026));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(f).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(f).toHaveBeenCalledTimes(2);

    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('重取成功後更新資料，且過程中不回到 loading', async () => {
    vi.useFakeTimers();
    const responses = [
      makeRecap({ metadata_pending: 2, total_count: 10 }),
      makeRecap({ metadata_pending: 0, total_count: 12 }),
    ];
    vi.stubGlobal('fetch', vi.fn(() => json(200, responses.shift())));
    const { result } = renderHook(() => useRecap(2026));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(result.current.data?.total_count).toBe(10);

    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(result.current.status).toBe('ready');
    expect(result.current.data?.total_count).toBe(12);
  });

  it('metadata_pending 為 0 時不重取', async () => {
    vi.useFakeTimers();
    const f = vi.fn(() => json(200, makeRecap({ metadata_pending: 0 })));
    vi.stubGlobal('fetch', f);
    renderHook(() => useRecap(2026));
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('換年份時，舊請求的回應不覆蓋新年份', async () => {
    let resolveOld: (r: Response) => void = () => {};
    const f = vi.fn((url: string) =>
      url.endsWith('year=2025')
        ? new Promise<Response>((res) => { resolveOld = res; })
        : json(200, makeRecap({ year: 2026 }))
    );
    vi.stubGlobal('fetch', f);
    const { result, rerender } = renderHook(({ y }) => useRecap(y), { initialProps: { y: 2025 } });
    rerender({ y: 2026 });
    await waitFor(() => expect(result.current.data?.year).toBe(2026));

    await act(async () => {
      resolveOld({ ok: true, status: 200, json: () => Promise.resolve(makeRecap({ year: 2025 })) } as Response);
    });
    expect(result.current.data?.year).toBe(2026);
  });

  it('retry() 失敗後重新請求', async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(() => json(500, {}))
      .mockImplementation(() => json(200, makeRecap()));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useRecap(2026));
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('useRecap 記憶體快取（重複進出 Recap 不重打後端）', () => {
  beforeEach(() => {
    auth.current = { token: 'tok', loading: false };
    clearRecapCache();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('第二次打開同一年：直接用快取，不請求、也不經過 loading', async () => {
    const f = vi.fn(() => json(200, makeRecap({ year: 2026 })));
    vi.stubGlobal('fetch', f);
    const first = renderHook(() => useRecap(2026));
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    first.unmount();

    const second = renderHook(() => useRecap(2026));
    expect(second.result.current.status).toBe('ready');
    expect(second.result.current.data?.year).toBe(2026);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('快取 5 分鐘後過期，重新請求', async () => {
    vi.useFakeTimers();
    const f = vi.fn(() => json(200, makeRecap()));
    vi.stubGlobal('fetch', f);
    const first = renderHook(() => useRecap(2026));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    first.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 1000); });
    renderHook(() => useRecap(2026));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('新增收藏後快取失效（資料已不是最新），再打開會重新請求', async () => {
    const f = vi.fn(() => json(200, makeRecap()));
    vi.stubGlobal('fetch', f);
    const first = renderHook(() => useRecap(2026));
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    first.unmount();

    act(() => emitStoryAdded());
    const second = renderHook(() => useRecap(2026));
    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('不同帳號（token）不共用快取', async () => {
    const f = vi.fn(() => json(200, makeRecap()));
    vi.stubGlobal('fetch', f);
    const a = renderHook(() => useRecap(2026));
    await waitFor(() => expect(a.result.current.status).toBe('ready'));
    a.unmount();
    auth.current = { token: 'other', loading: false };
    const b = renderHook(() => useRecap(2026));
    await waitFor(() => expect(b.result.current.status).toBe('ready'));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('metadata_pending > 0 的結果不進快取（還在補資料，下次要重取）', async () => {
    const f = vi.fn(() => json(200, makeRecap({ metadata_pending: 2 })));
    vi.stubGlobal('fetch', f);
    const first = renderHook(() => useRecap(2026));
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    first.unmount();
    const second = renderHook(() => useRecap(2026));
    await waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    second.unmount();
  });

  it('失敗不進快取；retry() 會略過快取重新請求', async () => {
    const f = vi
      .fn()
      .mockImplementationOnce(() => json(500, {}))
      .mockImplementation(() => json(200, makeRecap()));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useRecap(2026));
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe('useRecapYears', () => {
  beforeEach(() => {
    auth.current = { token: 'tok', loading: false };
    clearRecapCache();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const years = { threshold: 3, years: [{ year: 2026, count: 5 }], current: { year: 2026, count: 5 } };

  it('成功 → years 與 loading=false', async () => {
    const f = vi.fn(() => json(200, years));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useRecapYears());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.years).toEqual(years);
    expect(result.current.error).toBe(false);
    expect(f).toHaveBeenCalledWith('http://api/api/v1/collection/recap/years', {
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('HTTP 失敗與例外 → error=true、years 為 null', async () => {
    vi.stubGlobal('fetch', vi.fn(() => json(500, {})));
    const a = renderHook(() => useRecapYears());
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    expect(a.result.current.error).toBe(true);
    expect(a.result.current.years).toBeNull();

    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('x'))));
    const b = renderHook(() => useRecapYears());
    await waitFor(() => expect(b.result.current.loading).toBe(false));
    expect(b.result.current.error).toBe(true);
  });

  it('同時多個元件要年份清單：只送一個請求（Profile 一次造訪原本會打 4 次）', async () => {
    const f = vi.fn(() => json(200, years));
    vi.stubGlobal('fetch', f);
    const hooks = [renderHook(() => useRecapYears()), renderHook(() => useRecapYears()), renderHook(() => useRecapYears())];
    await waitFor(() => hooks.forEach((h) => expect(h.result.current.years).toEqual(years)));
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('短時間內再次掛載（頁面來回切換）用快取，不再請求；新增收藏後失效', async () => {
    const f = vi.fn(() => json(200, years));
    vi.stubGlobal('fetch', f);
    const a = renderHook(() => useRecapYears());
    await waitFor(() => expect(a.result.current.loading).toBe(false));
    a.unmount();
    const b = renderHook(() => useRecapYears());
    await waitFor(() => expect(b.result.current.years).toEqual(years));
    expect(f).toHaveBeenCalledTimes(1);
    b.unmount();

    act(() => emitStoryAdded());
    const c = renderHook(() => useRecapYears());
    await waitFor(() => expect(c.result.current.years).toEqual(years));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('失敗不快取：下一次掛載會重新請求', async () => {
    const f = vi.fn().mockImplementationOnce(() => json(500, {})).mockImplementation(() => json(200, years));
    vi.stubGlobal('fetch', f);
    const a = renderHook(() => useRecapYears());
    await waitFor(() => expect(a.result.current.error).toBe(true));
    a.unmount();
    const b = renderHook(() => useRecapYears());
    await waitFor(() => expect(b.result.current.years).toEqual(years));
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('驗證完成但沒有 token → 不請求、loading=false', async () => {
    auth.current = { token: null, loading: false };
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useRecapYears());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(f).not.toHaveBeenCalled();
    expect(result.current.years).toBeNull();
  });
});
