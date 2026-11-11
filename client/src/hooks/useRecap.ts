'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl } from '@/lib/api';
import type { RecapData, RecapYears } from '@/lib/recap/types';

const PENDING_REFETCH_MS = 4000;

export type RecapStatus = 'idle' | 'loading' | 'ready' | 'not_enough' | 'forbidden' | 'error';

interface RecapState {
  data: RecapData | null;
  status: RecapStatus;
  needed: number | null;
}

const IDLE: RecapState = { data: null, status: 'idle', needed: null };

/**
 * 讀取某年的 Recap。
 * - year 為 null 或還沒有 token → idle（不請求）。
 * - 404 且 detail.code === 'recap_not_enough' → not_enough（帶 needed）；403 → forbidden；其他失敗 → error。
 * - metadata_pending > 0（後端補抓超過時間預算）→ 4 秒後自動重取「一次」，重取期間畫面維持不閃。
 * - 換年份或卸載時，舊請求的回應不會覆蓋新狀態。
 */
export function useRecap(year: number | null): RecapState & { retry: () => void } {
  const { token } = useAuth();
  const [state, setState] = useState<RecapState>(IDLE);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (year == null || !token) {
      setState(IDLE);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async (isRefetch: boolean) => {
      try {
        const res = await fetch(getApiUrl(`/api/v1/collection/recap?year=${year}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as RecapData;
          if (cancelled) return;
          setState({ data, status: 'ready', needed: null });
          if (!isRefetch && data.metadata_pending > 0) {
            timer = setTimeout(() => load(true), PENDING_REFETCH_MS);
          }
          return;
        }
        if (isRefetch) return; // 重取失敗就沿用先前資料
        if (res.status === 404) {
          const body = await res.json().catch(() => null);
          if (cancelled) return;
          const detail = body?.detail;
          if (detail && typeof detail === 'object' && detail.code === 'recap_not_enough') {
            setState({ data: null, status: 'not_enough', needed: Number(detail.needed) });
            return;
          }
        }
        setState({ data: null, status: res.status === 403 ? 'forbidden' : 'error', needed: null });
      } catch {
        if (!cancelled && !isRefetch) setState({ data: null, status: 'error', needed: null });
      }
    };

    setState({ data: null, status: 'loading', needed: null });
    load(false);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [year, token, attempt]);

  return { ...state, retry };
}

/** 可看的年份清單（達門檻）與當年目前部數；驗證完成但沒有 token 時結束 loading。 */
export function useRecapYears(): { years: RecapYears | null; loading: boolean; error: boolean } {
  const { token, loading: authLoading } = useAuth();
  const [years, setYears] = useState<RecapYears | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      if (!authLoading) setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await fetch(getApiUrl('/api/v1/collection/recap/years'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`recap years ${res.status}`);
        const data = (await res.json()) as RecapYears;
        if (!cancelled) setYears(data);
      } catch {
        if (!cancelled) {
          setYears(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, authLoading]);

  return { years, loading, error };
}
