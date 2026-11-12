'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Download, Loader2, RefreshCw, Save, Share2, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { getRenderServiceHealth } from '@/lib/share-api';
import { track } from '@/lib/analytics';
import { buildScenes } from '@/lib/recap/scenes';
import { renderRecapScene, renderRecapScenes } from '@/lib/recap/renderCache';
import { fill } from '@/lib/recap/format';
import { saveAllImages, shareOneImage, type ShareOutcome } from '@/lib/recap/shareImages';
import type { RecapAspect, RecapData, RecapLocale, SceneKey } from '@/lib/recap/types';
import ScaledScene from './ScaledScene';
import type { RecapCopy } from './scenes/shared';

const HEALTH_INTERVAL_MS = 3000;
const HEALTH_TIMEOUT_MS = 60000;

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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 分享面板：比例（9:16／4:5）、逐張勾選（預設全選）。
 * 縮圖是前端場景元件縮小顯示，開啟當下不渲染、不等圖片服務；
 * 只有按「儲存全部／分享這一張」時，才把被勾選的場景送去圖片服務渲染（結果存在 renderCache，關掉面板也保留）。
 * 不顯示假成功：只有 ShareOutcome 為 saved 才說「已儲存到相簿」。
 */
export default function RecapShareSheet({ isOpen, onClose, recap, reflectionIndex, locale }: RecapShareSheetProps) {
  const { t } = useTranslation();
  const copy = t.recap;
  const c = copy.shareSheet;
  const isNative = Capacitor.isNativePlatform();

  const scenes = useMemo(() => buildScenes(recap, { forShare: true }), [recap]);
  const [aspectRatio, setAspectRatio] = useState<RecapAspect>('9:16');
  const [selected, setSelected] = useState<SceneKey[]>(scenes);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ShareOutcome | null>(null);
  const serviceReady = useRef(false);
  const lastAction = useRef<(() => void) | null>(null);

  const selectedOrdered = useMemo(() => scenes.filter((k) => selected.includes(k)), [scenes, selected]);
  const settings = useMemo(() => ({ aspectRatio, locale, reflectionIndex }), [aspectRatio, locale, reflectionIndex]);

  // 背景叫醒圖片服務（Railway 冷啟動）：只 ping 一次，不擋畫面、不顯示狀態
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getRenderServiceHealth()
      .then((ok) => {
        if (!cancelled && ok) serviceReady.current = true;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setResult(null);
      setUnavailable(false);
      setPreparing(false);
      setProgress(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  /** 確保圖片服務醒著：沒醒就每 3 秒問一次，最多 60 秒 */
  const ensureService = async (): Promise<boolean> => {
    if (serviceReady.current) return true;
    let elapsed = 0;
    for (;;) {
      if (await getRenderServiceHealth()) {
        serviceReady.current = true;
        setPreparing(false);
        return true;
      }
      setPreparing(true);
      if (elapsed >= HEALTH_TIMEOUT_MS) break;
      await sleep(HEALTH_INTERVAL_MS);
      elapsed += HEALTH_INTERVAL_MS;
    }
    setPreparing(false);
    return false;
  };

  const finish = (outcome: ShareOutcome, sceneCount: number) => {
    setResult(outcome);
    if (outcome.status === 'saved' || outcome.status === 'shared' || outcome.status === 'downloaded') {
      track('recap_shared', { year: recap.year, sceneCount });
    }
  };

  /** 共用流程：確認服務 → 渲染 → 交給系統儲存／分享；任何一步失敗都不顯示成功 */
  const run = async (action: () => Promise<void>) => {
    lastAction.current = () => void run(action);
    setResult(null);
    setUnavailable(false);
    setBusy(true);
    try {
      if (!(await ensureService())) {
        setUnavailable(true);
        return;
      }
      await action();
    } catch {
      setResult({ status: 'error', message: 'render failed' });
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const saveAll = () =>
    run(async () => {
      const keys = selectedOrdered;
      setProgress({ done: 0, total: keys.length });
      const rendered = await renderRecapScenes({
        recap,
        sceneKeys: keys,
        settings,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const images = rendered.map((r) => ({ name: r.sceneKey, blob: r.blob }));
      finish(await saveAllImages(images, { title: `${recap.year} Recap` }), images.length);
    });

  const shareOne = (key: SceneKey) =>
    run(async () => {
      const blob = await renderRecapScene({ recap, sceneKey: key, settings });
      finish(await shareOneImage({ name: key, blob }, { title: `${recap.year} Recap` }), 1);
    });

  const toggle = (key: SceneKey) => {
    setResult(null);
    setSelected(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  const resultText =
    result?.status === 'saved' ? c.savedToAlbum
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

        {progress && (
          <div data-testid="share-progress" className="text-xs text-text-desc">
            {fill(c.progress, { done: progress.done, total: progress.total })}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          {scenes.map((key) => {
            const checked = selected.includes(key);
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
                  <div data-testid={`scene-thumb-${key}`}>
                    <ScaledScene
                      sceneKey={key}
                      recap={recap}
                      copy={copy}
                      locale={locale}
                      aspectRatio={aspectRatio}
                      reflectionIndex={reflectionIndex}
                      lazy
                    />
                  </div>
                </label>
                <button
                  type="button"
                  data-testid={`share-one-${key}`}
                  disabled={busy}
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

        {unavailable && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-white/70">{c.unavailable}</p>
            <button
              type="button"
              data-testid="share-retry"
              onClick={() => lastAction.current?.()}
              className="flex items-center gap-2 px-6 h-11 rounded-full bg-accent-gold text-folio-black text-xs font-black"
            >
              <RefreshCw size={14} /> {c.retry}
            </button>
          </div>
        )}

        <button
          type="button"
          data-testid="share-main"
          disabled={busy || selectedOrdered.length === 0}
          onClick={saveAll}
          className="h-14 rounded-2xl bg-accent-gold text-folio-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {busy ? <Loader2 className="animate-spin" size={18} /> : isNative ? <Save size={18} /> : <Download size={18} />}
          {preparing ? c.preparing : isNative ? c.saveAll : c.downloadAll}
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
      </div>
    </div>
  );
}
