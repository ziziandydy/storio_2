'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, Search, Share2 } from 'lucide-react';
import { track } from '@/lib/analytics';
import RecapShareSheet from '@/components/recap/RecapShareSheet';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { useRecap } from '@/hooks/useRecap';
import { buildScenes } from '@/lib/recap/scenes';
import { fill } from '@/lib/recap/format';
import { SCENE_SIZE } from '@/lib/recap/types';
import RecapScene from '@/components/recap/RecapScene';
import RecapGuestHint from '@/components/recap/RecapGuestHint';

const SLIDE_GAP = 16;
const SIDE_PADDING = 24;

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
  const [active, setActive] = useState(0);
  const [scale, setScale] = useState(1);
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

  // 場景固定 400px 寬，預覽以縮放貼合手機寬度（輸出圖不受影響）
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - SIDE_PADDING * 2) / SCENE_SIZE['9:16'].w));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  if (year == null) return null;

  const slideWidth = SCENE_SIZE['9:16'].w * scale;
  const slideHeight = SCENE_SIZE['9:16'].h * scale;

  const header = (
    <header className="flex items-center gap-3 px-4 pb-4" style={{ paddingTop: 'calc(var(--sa-top, 0px) + 1rem)' }}>
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
    const slideCount = scenes.length + 1; // 最後一頁是「繼續收藏」

    body = (
      <>
        {user?.is_anonymous && <RecapGuestHint />}
        <div
          className="flex overflow-x-auto snap-x snap-mandatory py-4"
          style={{ gap: `${SLIDE_GAP}px`, paddingLeft: `${SIDE_PADDING}px`, paddingRight: `${SIDE_PADDING}px` }}
          onScroll={(e) => setActive(Math.round(e.currentTarget.scrollLeft / (slideWidth + SLIDE_GAP)))}
        >
          {scenes.map((key, i) => (
            <div key={key} data-testid="recap-slide" data-scene={key} className="snap-center shrink-0 flex flex-col items-center gap-3">
              <div style={{ width: slideWidth, height: slideHeight, overflow: 'hidden', borderRadius: '16px' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: SCENE_SIZE['9:16'].w, height: SCENE_SIZE['9:16'].h }}>
                  <RecapScene
                    sceneKey={key}
                    recap={data}
                    copy={r}
                    locale={locale}
                    aspectRatio="9:16"
                    animate={i === active}
                    reflectionIndex={reflectionIndex}
                  />
                </div>
              </div>
              {key === 'reflection' && candidates.length > 1 && (
                <button
                  type="button"
                  onClick={() => setReflectionIndex((n) => (n + 1) % candidates.length)}
                  className="px-4 h-9 rounded-full bg-white/10 text-xs font-bold"
                >
                  {r.reflection.swap}
                </button>
              )}
            </div>
          ))}
          <div
            data-testid="recap-continue"
            className="snap-center shrink-0 flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-[#121212] text-center px-6"
            style={{ width: slideWidth, height: slideHeight }}
          >
            <p className="text-xl font-black">{r.scene.closing.tagline}</p>
            <button
              type="button"
              onClick={() => router.push('/search?focus=1')}
              className="flex items-center gap-2 px-8 h-14 rounded-full bg-accent-gold text-folio-black text-xs font-black tracking-widest"
            >
              <Search size={16} /> {r.continueCollecting}
            </button>
          </div>
        </div>
        <div className="flex justify-center gap-1.5 pb-4" aria-hidden="true">
          {Array.from({ length: slideCount }, (_, i) => (
            <span key={i} data-testid="recap-dot" className={`h-1.5 rounded-full transition-all ${i === active ? 'w-5 bg-accent-gold' : 'w-1.5 bg-white/25'}`} />
          ))}
        </div>
        <div data-testid="recap-footer-slot" className="flex justify-center px-4">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-2 px-8 h-12 rounded-full bg-white/10 border border-white/15 text-xs font-black tracking-widest active:scale-95 transition-transform"
          >
            <Share2 size={16} /> {r.share}
          </button>
        </div>
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
