'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getApiUrl } from '@/lib/api';
import { onStoryAdded } from '@/lib/notification-events';
import type { RecapData, RecapYears } from '@/lib/recap/types';

const PENDING_REFETCH_MS = 4000;
const RECAP_TTL_MS = 5 * 60 * 1000;
const YEARS_TTL_MS = 60 * 1000;

export type RecapStatus = 'idle' | 'loading' | 'ready' | 'not_enough' | 'forbidden' | 'error';

interface RecapState {
  data: RecapData | null;
  status: RecapStatus;
  needed: number | null;
}

const IDLE: RecapState = { data: null, status: 'idle', needed: null };

/**
 * 記憶體快取（這次 App 使用期間）：Profile／Recap 頁來回切換不重打後端。
 * 只存成功且資料已補齊的結果；新增收藏（emitStoryAdded）時全部清掉，下次再取最新。
 * key 含 token，換帳號不會看到別人的快取。
 */
const recapCache = new Map<string, { data: RecapData; expiresAt: number }>();
const yearsCache = new Map<string, { data: RecapYears; expiresAt: number }>();
const yearsInflight = new Map<string, Promise<RecapYears>>();
let listening = false;

export function clearRecapCache(): void {
  recapCache.clear();
  yearsCache.clear();
  yearsInflight.clear();
}

function ensureInvalidationListener(): void {
  if (listening) return;
  listening = true;
  onStoryAdded(clearRecapCache);
}

const recapKey = (token: string, year: number) => `${token}|${year}`;

function readRecapCache(token: string | null, year: number | null): RecapData | null {
  if (!token || year == null) return null;
  const entry = recapCache.get(recapKey(token, year));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    recapCache.delete(recapKey(token, year));
    return null;
  }
  return entry.data;
}

function writeRecapCache(token: string, year: number, data: RecapData): void {
  if (data.metadata_pending > 0) {
    recapCache.delete(recapKey(token, year)); // 還在補資料，不可當成最終結果
    return;
  }
  recapCache.set(recapKey(token, year), { data, expiresAt: Date.now() + RECAP_TTL_MS });
}

/**
 * 讀取某年的 Recap。
 * - year 為 null 或還沒有 token → idle（不請求）。
 * - 有未過期的快取 → 直接 ready，不請求；retry() 會略過快取。
 * - 404 且 detail.code === 'recap_not_enough' → not_enough（帶 needed）；403 → forbidden；其他失敗 → error。
 * - metadata_pending > 0（後端補抓超過時間預算）→ 4 秒後自動重取「一次」，重取期間畫面維持不閃。
 * - 換年份或卸載時，舊請求的回應不會覆蓋新狀態。
 */
export function useRecap(year: number | null): RecapState & { retry: () => void } {
  const { token } = useAuth();
  const [state, setState] = useState<RecapState>(() => {
    ensureInvalidationListener();
    const cached = readRecapCache(token, year);
    return cached ? { data: cached, status: 'ready', needed: null } : IDLE;
  });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    if (token && year != null) recapCache.delete(recapKey(token, year));
    setAttempt((n) => n + 1);
  }, [token, year]);

  useEffect(() => {
    if (year == null || !token) {
      setState(IDLE);
      return;
    }
    ensureInvalidationListener();
    const cached = readRecapCache(token, year);
    if (cached) {
      setState({ data: cached, status: 'ready', needed: null });
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
          writeRecapCache(token, year, data);
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

/** 同一個 token 同時只送一個請求；成功結果短時間內重用，失敗不快取。 */
function fetchYears(token: string): Promise<RecapYears> {
  ensureInvalidationListener();
  const cached = yearsCache.get(token);
  if (cached && Date.now() <= cached.expiresAt) return Promise.resolve(cached.data);
  const running = yearsInflight.get(token);
  if (running) return running;
  const promise = (async () => {
    const res = await fetch(getApiUrl('/api/v1/collection/recap/years'), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`recap years ${res.status}`);
    const data = (await res.json()) as RecapYears;
    yearsCache.set(token, { data, expiresAt: Date.now() + YEARS_TTL_MS });
    return data;
  })().finally(() => {
    yearsInflight.delete(token);
  });
  yearsInflight.set(token, promise);
  return promise;
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
        const data = await fetchYears(token);
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
