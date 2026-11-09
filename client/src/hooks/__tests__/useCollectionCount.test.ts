// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ current: { token: 'tok' as string | null, loading: false } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => auth.current }));
vi.mock('@/lib/api', () => ({ getApiUrl: (p: string) => `http://api${p}` }));

import { useCollectionCount } from '../useCollectionCount';

const okJson = (total_count: number) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ total_count }) } as Response);

describe('useCollectionCount', () => {
  beforeEach(() => {
    auth.current = { token: 'tok', loading: false };
  });
  afterEach(() => vi.unstubAllGlobals());

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
});
