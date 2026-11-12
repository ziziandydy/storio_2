'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Download, Loader2, RefreshCw, Save, Share2, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useProgressiveRenderQueue } from '@/hooks/useProgressiveRenderQueue';
import { getRenderServiceHealth } from '@/lib/share-api';
import { track } from '@/lib/analytics';
import { buildScenes } from '@/lib/recap/scenes';
import { buildRecapPayload, recapRenderSettings } from '@/lib/recap/renderPayload';
import { fill } from '@/lib/recap/format';
import { saveAllImages, shareOneImage, type ShareOutcome } from '@/lib/recap/shareImages';
import type { RecapAspect, RecapData, RecapLocale, SceneKey } from '@/lib/recap/types';
import type { RecapCopy } from './scenes/shared';

type ServiceStatus = 'idle' | 'checking' | 'cold' | 'ready' | 'timeout';

const HEALTH_INTERVAL_MS = 3000;
const HEALTH_TIMEOUT_MS = 60000;
const MAX_HEALS = 2;

interface RecapShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  recap: RecapData;
  /** 預覽目前選的心得（輸出必須與預覽一致） */
  reflectionIndex: number;
  locale: RecapLocale;
}

function sceneLabel(key: SceneKey, copy: RecapCopy, recap: RecapData): string {
  const s = copy.scene;
  switch (key) {
    case 'opening': return s.opening.title;
    case 'total': return s.total.collected;
    case 'movies': return s.movies.title;
    case 'series': return s.series.title;
    case 'books': return s.books.title;
    case 'genres': return s.genres.title;
    case 'eras': return s.eras.title;
    case 'title': return s.title.eyebrow;
    case 'monthly': return s.monthly.title;
    case 'peak_month': return s.peakMonth.title;
    case 'months_active': return fill(s.monthsActive.text, { n: recap.months_active?.count ?? 0 });
    case 'top_rated': return s.topRated.title;
    case 'first_last': return s.firstLast.title;
    case 'reflection': return s.reflection.title;
    case 'closing': return s.closing.tagline;
    default: return key;
  }
}

/**
 * 分享面板：比例（9:16／4:5）、逐張勾選（預設全選）、沿用 useProgressiveRenderQueue 逐張產生、
 * 原生「儲存全部到相簿」＋每張「分享這一張」，網頁「下載全部」。
 * 階段 2 沒有影片選項。不顯示假成功：只有 ShareOutcome 為 saved 才說「已儲存到相簿」。
 */
export default function RecapShareSheet({ isOpen, onClose, recap, reflectionIndex, locale }: RecapShareSheetProps) {
  const { t } = useTranslation();
  const copy = t.recap;
  const c = copy.shareSheet;
  const isNative = Capacitor.isNativePlatform();

  const scenes = useMemo(() => buildScenes(recap, { forShare: true }), [recap]);
  const [aspectRatio, setAspectRatio] = useState<RecapAspect>('9:16');
  const [selected, setSelected] = useState<SceneKey[]>(scenes);
  const [status, setStatus] = useState<ServiceStatus>('idle');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ShareOutcome | null>(null);
  const [notice, setNotice] = useState<'refreshing' | null>(null);
  const healthTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const healCount = useRef<Record<string, number>>({});
  const sawRendering = useRef(false);

  const selectedOrdered = useMemo(() => scenes.filter((k) => selected.includes(k)), [scenes, selected]);

  const settings = useMemo(
    () => recapRenderSettings({ aspectRatio, locale, reflectionIndex }),
    [aspectRatio, locale, reflectionIndex]
  );
  const getPayload = useCallback((id: string) => buildRecapPayload(recap, id as SceneKey), [recap]);

  const { getCacheEntry, prioritize, cleanup, isRendering, queue } = useProgressiveRenderQueue({
    allTemplates: selectedOrdered,
    currentTemplate: selectedOrdered[0] ?? scenes[0],
    getPayload,
    settings,
    enabled: isOpen && status === 'ready' && selectedOrdered.length > 0,
  });

  // 圖片服務冷啟動檢查（沿用 MonthlyRecapModal 的做法：每 3 秒一次，最多 60 秒）
  const stopHealth = useCallback(() => {
    if (healthTimer.current) clearInterval(healthTimer.current);
    healthTimer.current = null;
  }, []);

  const startHealth = useCallback(() => {
    stopHealth();
    setStatus('checking');
    let elapsed = 0;
    const check = async () => {
      if (await getRenderServiceHealth()) {
        stopHealth();
        setStatus('ready');
        return;
      }
      elapsed += HEALTH_INTERVAL_MS;
      if (elapsed >= HEALTH_TIMEOUT_MS) {
        stopHealth();
        setStatus('timeout');
        return;
      }
      setStatus('cold');
    };
    check();
    healthTimer.current = setInterval(check, HEALTH_INTERVAL_MS);
  }, [stopHealth]);

  useEffect(() => {
    if (!isOpen) {
      cleanup();
      stopHealth();
      setStatus('idle');
      setResult(null);
      setNotice(null);
      healCount.current = {};
      sawRendering.current = false;
      return;
    }
    startHealth();
    return stopHealth;
  }, [isOpen, cleanup, startHealth, stopHealth]);

  // 自癒：渲染中切比例等情況，舊渲染完成後會從新佇列被移除而沒人補渲染（hook 的已知缺口）。
  // 渲染全部結束、佇列已空，但仍有勾選的場景沒有快取時，重新排入；同一場景同一組設定最多補 2 次，
  // 避免圖片服務壞掉時無限重試。
  useEffect(() => {
    if (isRendering) {
      sawRendering.current = true;
      return;
    }
    if (!isOpen || status !== 'ready' || !sawRendering.current || queue.length > 0) return;
    const settingsKey = `${aspectRatio}|${locale}|${reflectionIndex}`;
    for (const key of selectedOrdered) {
      if (getCacheEntry(key)) continue;
      const id = `${settingsKey}:${key}`;
      const used = healCount.current[id] ?? 0;
      if (used >= MAX_HEALS) continue;
      healCount.current[id] = used + 1;
      prioritize(key);
    }
  }, [isOpen, status, isRendering, queue, selectedOrdered, aspectRatio, locale, reflectionIndex, getCacheEntry, prioritize]);

  if (!isOpen) return null;

  const done = selectedOrdered.filter((k) => getCacheEntry(k)).length;
  const allReady = selectedOrdered.length > 0 && done === selectedOrdered.length;

  const toggle = (key: SceneKey) => {
    setResult(null);
    setNotice(null);
    if (selected.includes(key)) {
      setSelected(selected.filter((k) => k !== key));
    } else {
      setSelected([...selected, key]);
      if (!getCacheEntry(key)) prioritize(key);
    }
  };

  const finish = (outcome: ShareOutcome, sceneCount: number) => {
    setNotice(null);
    setResult(outcome);
    if (outcome.status === 'saved' || outcome.status === 'shared' || outcome.status === 'downloaded') {
      track('recap_shared', { year: recap.year, sceneCount });
    }
  };

  const saveAll = async () => {
    const images = selectedOrdered.flatMap((key) => {
      const entry = getCacheEntry(key);
      return entry ? [{ name: key, blob: entry.blob }] : [];
    });
    // 快取有 5 分鐘 TTL：停留過久後按儲存，可能有場景的快取已過期。不可少張就送出還顯示成功。
    if (images.length !== selectedOrdered.length) {
      selectedOrdered.forEach((key) => {
        if (!getCacheEntry(key)) prioritize(key);
      });
      setResult(null);
      setNotice('refreshing');
      return;
    }
    setNotice(null);
    setBusy(true);
    try {
      finish(await saveAllImages(images, { title: `${recap.year} Recap` }), images.length);
    } finally {
      setBusy(false);
    }
  };

  const shareOne = async (key: SceneKey) => {
    const entry = getCacheEntry(key);
    if (!entry) return;
    setBusy(true);
    try {
      finish(await shareOneImage({ name: key, blob: entry.blob }, { title: `${recap.year} Recap` }), 1);
    } finally {
      setBusy(false);
    }
  };

  const resultText =
    notice === 'refreshing' ? c.refreshing
      : result?.status === 'saved' ? c.savedToAlbum
      : result?.status === 'downloaded' ? c.downloadStarted
      : result?.status === 'shared' ? c.done
      : result?.status === 'error' ? c.failed
      : null;

  return (
    <div data-testid="share-sheet" className="fixed inset-0 z-[130] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[88vh] overflow-y-auto bg-[#121212] border-t border-white/10 rounded-t-[32px] p-6 pb-10 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{c.title}</h2>
          <button type="button" aria-label={c.close} data-testid="share-close" onClick={onClose} className="p-2 rounded-full bg-white/10">
            <X size={16} />
          </button>
        </div>

        {(status === 'checking' || status === 'cold') && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="animate-spin text-accent-gold" size={28} />
            <p className="text-sm text-white/70">{c.preparing}</p>
            {status === 'cold' && <p className="text-xs text-white/40">{c.coldHint}</p>}
          </div>
        )}

        {status === 'timeout' && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="text-sm text-white/70">{c.unavailable}</p>
            <button
              type="button"
              data-testid="share-retry"
              onClick={startHealth}
              className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent-gold text-folio-black text-xs font-black"
            >
              <RefreshCw size={14} /> {c.retry}
            </button>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="flex gap-2">
              {(['9:16', '4:5'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  data-testid={`ratio-${ratio}`}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 h-11 rounded-2xl border text-xs font-bold transition-all ${
                    aspectRatio === ratio ? 'bg-white/10 border-accent-gold/50' : 'border-white/10'
                  }`}
                >
                  {ratio === '9:16' ? c.ratioStory : c.ratioPost}
                </button>
              ))}
            </div>

            <div data-testid="share-progress" className="text-xs text-text-desc">
              {fill(c.progress, { done, total: selectedOrdered.length })}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {scenes.map((key) => {
                const checked = selected.includes(key);
                const entry = getCacheEntry(key);
                const label = sceneLabel(key, copy, recap);
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className={`relative block rounded-xl overflow-hidden border ${checked ? 'border-accent-gold/60' : 'border-white/10 opacity-50'}`}>
                      <input
                        type="checkbox"
                        data-testid={`scene-check-${key}`}
                        aria-label={label}
                        checked={checked}
                        onChange={() => toggle(key)}
                        className="absolute top-2 left-2 z-10 h-4 w-4 accent-[#c5a059]"
                      />
                      <div
                        data-testid={`scene-thumb-${key}`}
                        className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/5]'} bg-white/5 flex items-center justify-center`}
                      >
                        {entry ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.objectUrl} alt={label} className="w-full h-full object-contain" />
                        ) : checked ? (
                          <Loader2 className="animate-spin text-accent-gold" size={18} />
                        ) : null}
                      </div>
                    </label>
                    <button
                      type="button"
                      data-testid={`share-one-${key}`}
                      disabled={busy || !entry}
                      onClick={() => shareOne(key)}
                      className="h-8 rounded-lg bg-white/5 text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-40"
                    >
                      <Share2 size={10} /> {c.shareOne}
                    </button>
                  </div>
                );
              })}
            </div>

            {selectedOrdered.length === 0 && <p className="text-xs text-text-desc text-center">{c.pickOne}</p>}

            <button
              type="button"
              data-testid="share-main"
              disabled={busy || !allReady}
              onClick={saveAll}
              className="h-14 rounded-2xl bg-accent-gold text-folio-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {busy || (!allReady && selectedOrdered.length > 0) ? (
                <Loader2 className="animate-spin" size={18} />
              ) : isNative ? (
                <Save size={18} />
              ) : (
                <Download size={18} />
              )}
              {isNative ? c.saveAll : c.downloadAll}
            </button>

            {resultText && (
              <div
                data-testid="share-result"
                className={`flex items-center justify-center gap-2 text-sm ${result?.status === 'error' ? 'text-red-400' : 'text-accent-gold'}`}
              >
                {result?.status !== 'error' && <Check size={16} />}
                {resultText}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
