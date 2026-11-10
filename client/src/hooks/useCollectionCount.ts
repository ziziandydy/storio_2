'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl } from '@/lib/api';
import { onStoryAdded } from '@/lib/notification-events';

/**
 * 讀取目前用戶的館藏總數（/collection/stats 的 total_count）。
 * - loading：驗證進行中或請求進行中
 * - 失敗、或驗證完成後沒有 token：count 為 null（視為未知）
 * - 收到 storyAdded 事件時靜默重抓（loading 維持 false）
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
    let seq = 0; // 只採用最後一次請求的結果，避免較舊回應覆蓋較新數量
    const load = async () => {
      const mine = ++seq;
      try {
        const res = await fetch(getApiUrl('/api/v1/collection/stats'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`stats ${res.status}`);
        const data = await res.json();
        if (!cancelled && mine === seq) setCount(typeof data.total_count === 'number' ? data.total_count : null);
      } catch {
        if (!cancelled && mine === seq) setCount(null);
      } finally {
        if (!cancelled && mine === seq) setFetching(false);
      }
    };
    setFetching(true);
    load();
    // 新增成功（例如在首頁直接收藏）→ 靜默重抓：不把 loading 翻回 true，避免畫面閃空白
    const unsubscribe = onStoryAdded(() => { load(); });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [token, authLoading]);

  return { count, loading: fetching };
}
