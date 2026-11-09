'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl } from '@/lib/api';

/**
 * 讀取目前用戶的館藏總數（/collection/stats 的 total_count）。
 * - loading：驗證進行中或請求進行中
 * - 失敗、或驗證完成後沒有 token：count 為 null（視為未知）
 */
export function useCollectionCount(): { count: number | null; loading: boolean } {
  const { token, loading: authLoading } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!token) {
      // 驗證結束仍無 token：不會有結果，結束 loading
      if (!authLoading) setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    (async () => {
      try {
        const res = await fetch(getApiUrl('/api/v1/collection/stats'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`stats ${res.status}`);
        const data = await res.json();
        if (!cancelled) setCount(typeof data.total_count === 'number' ? data.total_count : null);
      } catch {
        if (!cancelled) setCount(null);
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, authLoading]);

  return { count, loading: fetching };
}
