// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';

const auth = vi.hoisted(() => ({ current: { token: 'tok' as string | null, loading: false } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/lib/api', () => ({ getApiUrl: (p: string) => `http://api${p}` }));

import { useCollectionCount } from '../useCollectionCount';
import { emitStoryAdded } from '@/lib/notification-events';

const okJson = (total_count: number) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ total_count }) } as Response);

describe('useCollectionCount', () => {
  beforeEach(() => {
    auth.current = { token: 'tok', loading: false };
  });
  afterEach(() => {
    cleanup(); // 卸載前一個測試的 hook，避免殘留的事件監聽干擾
    vi.unstubAllGlobals();
  });

  it('請求進行中 loading 為 true、count 為 null', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { result } = renderHook(() => useCollectionCount());
    expect(result.current).toEqual({ count: null, loading: true });
  });

  it.each([0, 1, 7])('成功回傳 total_count=%i', async (n) => {
    const f = vi.fn(() => okJson(n));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(n);
    expect(f).toHaveBeenCalledWith('http://api/api/v1/collection/stats', {
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('HTTP 失敗 → count 為 null', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false } as Response)));
    const { result } = renderHook(() => useCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBeNull();
  });

  it('網路例外 → count 為 null', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('x'))));
    const { result } = renderHook(() => useCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBeNull();
  });

  it('驗證完成但沒有 token → 不請求、count 為 null', async () => {
    auth.current = { token: null, loading: false };
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('驗證仍在進行 → 維持 loading', () => {
    auth.current = { token: null, loading: true };
    vi.stubGlobal('fetch', vi.fn());
    const { result } = renderHook(() => useCollectionCount());
    expect(result.current.loading).toBe(true);
  });

  it('收到新增事件 → 重新讀取，count 0 → 1，且過程中 loading 不會翻回 true', async () => {
    const f = vi.fn().mockImplementationOnce(() => okJson(0));
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.count).toBe(0);

    let resolve!: (r: Response) => void;
    f.mockImplementationOnce(() => new Promise<Response>((r) => { resolve = r; }));
    act(() => { emitStoryAdded(); });
    expect(f).toHaveBeenCalledTimes(2);
    // 新數量回來前維持現有畫面：不閃空白
    expect(result.current).toEqual({ count: 0, loading: false });

    await act(async () => {
      resolve({ ok: true, json: () => Promise.resolve({ total_count: 1 }) } as Response);
    });
    await waitFor(() => expect(result.current.count).toBe(1));
    expect(result.current.loading).toBe(false);
  });

  it('卸載後移除監聽：再收到事件不會重新讀取', async () => {
    const f = vi.fn(() => okJson(0));
    vi.stubGlobal('fetch', f);
    const { result, unmount } = renderHook(() => useCollectionCount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();
    emitStoryAdded();
    expect(f).toHaveBeenCalledTimes(1);
  });
});
