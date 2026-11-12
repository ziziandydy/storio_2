'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, Share2 } from 'lucide-react';
import { track } from '@/lib/analytics';
import RecapShareSheet from '@/components/recap/RecapShareSheet';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { useRecap } from '@/hooks/useRecap';
import { buildScenes } from '@/lib/recap/scenes';
import { fill } from '@/lib/recap/format';
import RecapScene from '@/components/recap/RecapScene';
import RecapGuestHint from '@/components/recap/RecapGuestHint';
import RecapStoryViewer from '@/components/recap/RecapStoryViewer';
import RecapContinueSlide from '@/components/recap/RecapContinueSlide';

/** 每頁停留時間；心得是長文字，多給一些時間讀 */
const SCENE_MS = 5000;
const REFLECTION_MS = 9000;

function parseYear(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1970 && n <= 2100 ? n : null;
}

function RecapPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const r = t.recap;

  const year = parseYear(searchParams.get('year'));
  const { data, status, needed, retry } = useRecap(year);
  const [reflectionIndex, setReflectionIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const openedYear = useRef<number | null>(null);

  useEffect(() => {
    if (year == null) router.replace('/profile');
  }, [year, router]);

  // 每次進入且資料 ready 時只記錄一次 recap_opened（metadata_pending 重取換新資料物件也不重複）
  useEffect(() => {
    if (status === 'ready' && year != null && openedYear.current !== year) {
      openedYear.current = year;
      track('recap_opened', { year });
    }
  }, [status, year]);

  if (year == null) return null;

  const header = (
    <header data-no-nav className="flex items-center gap-3 px-4 py-3" style={{ paddingTop: 'calc(var(--sa-top, 0px) + 0.75rem)' }}>
      <button type="button" aria-label={r.back} onClick={() => router.back()} className="p-2 rounded-full bg-white/10">
        <ArrowLeft size={18} />
      </button>
      <h1 className="text-lg font-black">{year}</h1>
      {data?.is_partial && (
        <span
          data-testid="recap-partial-badge"
          className="rounded-full border border-accent-gold/50 px-3 py-1 text-[11px] font-bold tracking-widest text-accent-gold"
        >
          {r.partialBadge}
        </span>
      )}
    </header>
  );

  let body: React.ReactNode;
  if (status === 'loading' || status === 'idle') {
    body = (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-white/70">
        <Loader2 className="animate-spin text-accent-gold" size={32} />
        <p className="text-sm">{r.loading}</p>
      </div>
    );
  } else if (status === 'not_enough') {
    body = (
      <div className="flex flex-col items-center justify-center gap-6 py-24 px-8 text-center">
        <p className="text-lg font-bold">{fill(r.notEnough, { n: needed ?? 0 })}</p>
        <button
          type="button"
          onClick={() => router.push('/search?focus=1')}
          className="px-6 h-12 rounded-full bg-accent-gold text-folio-black text-xs font-black tracking-widest"
        >
          {r.continueCollecting}
        </button>
      </div>
    );
  } else if (status === 'error' || status === 'forbidden' || !data) {
    body = (
      <div className="flex flex-col items-center justify-center gap-6 py-24 px-8 text-center">
        <p className="text-sm text-white/70">{r.errorRetry}</p>
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-2 px-6 h-12 rounded-full bg-accent-gold text-folio-black text-xs font-black"
        >
          <RefreshCw size={14} /> {r.retry}
        </button>
      </div>
    );
  } else {
    const scenes = buildScenes(data, { forShare: false });
    const candidates = data.reflection?.candidates ?? [];

    // 限時動態式：整頁固定在視窗內，不可上下捲動（頁首、進度條、分享都在 RecapStoryViewer 內）
    return (
      <>
        <RecapStoryViewer
          count={scenes.length + 1} // 最後一頁是「繼續收藏」
          paused={shareOpen}
          durationMs={(i) => (scenes[i] === 'reflection' ? REFLECTION_MS : SCENE_MS)}
          header={header}
          footer={
            <div data-no-nav data-testid="recap-footer-slot" className="flex justify-center px-4">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-2 px-8 h-12 rounded-full bg-white/10 border border-white/15 text-xs font-black tracking-widest active:scale-95 transition-transform"
              >
                <Share2 size={16} /> {r.share}
              </button>
            </div>
          }
          renderSlide={(i, isActive) =>
            i < scenes.length ? (
              <div
                data-testid="recap-slide"
                data-scene={scenes[i]}
                style={{ position: 'relative', width: 400, height: 711, overflow: 'hidden', borderRadius: 16 }}
              >
                <RecapScene
                  sceneKey={scenes[i]}
                  recap={data}
                  copy={r}
                  locale={locale}
                  aspectRatio="9:16"
                  animate={isActive}
                  reflectionIndex={reflectionIndex}
                />
                {scenes[i] === 'reflection' && candidates.length > 1 && (
                  <button
                    type="button"
                    data-no-nav
                    onClick={() => setReflectionIndex((n) => (n + 1) % candidates.length)}
                    className="absolute left-1/2 -translate-x-1/2 px-4 h-9 rounded-full bg-white/15 backdrop-blur text-xs font-bold"
                    style={{ bottom: 28, zIndex: 5 }}
                  >
                    {r.reflection.swap}
                  </button>
                )}
              </div>
            ) : (
              <div data-testid="recap-continue" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <RecapContinueSlide
                  active={isActive}
                  copy={r}
                  onContinue={() => router.push('/search?focus=1')}
                  extra={user?.is_anonymous ? <RecapGuestHint /> : undefined}
                />
              </div>
            )
          }
        />
        <RecapShareSheet
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          recap={data}
          reflectionIndex={reflectionIndex}
          locale={locale}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-folio-black text-white pb-16">
      {header}
      {body}
    </div>
  );
}

export default function RecapPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-folio-black" />}>
      <RecapPageInner />
    </Suspense>
  );
}
