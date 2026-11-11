'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRecapYears } from '@/hooks/useRecap';
import { useRecapEntry } from '@/hooks/useRecapEntry';
import { subscribeDismissed } from '@/lib/recap/entry';
import { fill } from '@/lib/recap/format';

const HINT_MS = 6000;

/**
 * Profile 的「年度 Recap」常駐一列（全年可見），樣式比照 Profile 的 ProfileItem。
 * - 有達標年份：可點入（1 個年份直接開、多個年份先選年份）。
 * - 當年未達門檻：副標顯示「再收藏 N 部，就能看到你的 {year}」（不責備）；若沒有任何達標年份則不可點入。
 * - 載入中或失敗：只顯示列，點擊無反應。
 */
export default function RecapProfileRow({ today }: { today?: Date }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { years } = useRecapYears();
  const { active: cardShowing } = useRecapEntry(today);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hint, setHint] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const r = t.recap;

  // 同一頁關閉置頂卡片時，在這一列上方提示「以後可以從這裡查看」，6 秒後自動消失
  useEffect(() => subscribeDismissed(() => setHint(true)), []);
  useEffect(() => {
    if (!hint) return;
    // 這一列在長頁面的中段，用戶是在最上方關閉卡片的：捲到畫面中央才看得到提示
    wrapperRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const id = setTimeout(() => setHint(false), HINT_MS);
    return () => clearTimeout(id);
  }, [hint]);

  // 置頂卡片還在時，卡片就是入口，這一列先隱藏避免重複
  if (cardShowing) return null;

  const list = years?.years ?? [];
  const clickable = list.length > 0;
  const currentListed = years ? list.some((y) => y.year === years.current.year) : true;
  const encourage =
    years && !currentListed
      ? fill(r.profileRowEncourage, {
          n: Math.max(0, years.threshold - years.current.count),
          year: years.current.year,
        })
      : null;

  const open = () => {
    if (!clickable) return;
    if (list.length === 1) router.push(`/recap?year=${list[0].year}`);
    else setPickerOpen(true);
  };

  return (
    <>
      <div ref={wrapperRef} className="relative border-b border-white/5 last:border-0">
      {hint && (
        <button
          type="button"
          data-testid="recap-dismiss-hint"
          onClick={() => setHint(false)}
          className="absolute right-3 bottom-full mb-2 z-20 max-w-[260px] rounded-2xl bg-accent-gold px-4 py-2.5 text-left text-xs font-bold leading-snug text-folio-black shadow-xl animate-in fade-in slide-in-from-bottom-1 duration-300"
        >
          {r.dismissHint}
          <span className="absolute -bottom-1 right-8 h-2.5 w-2.5 rotate-45 bg-accent-gold" aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        data-testid="recap-profile-row"
        disabled={!clickable}
        onClick={open}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group disabled:opacity-80 disabled:hover:bg-transparent"
      >
        <div className="flex items-center gap-3 min-[360px]:gap-4 min-w-0">
          <div className="p-2 rounded-xl bg-white/5 text-accent-gold group-hover:scale-110 transition-transform">
            <Sparkles size={18} />
          </div>
          <div className="flex flex-col items-start text-left min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-text-primary">{r.profileRow}</span>
              <span className="text-[10px] tracking-[0.12em] text-text-desc">{r.profileRowAlt}</span>
            </span>
            {encourage && <span className="text-xs text-text-desc">{encourage}</span>}
          </div>
        </div>
        {clickable && <ChevronRight size={16} className="text-text-desc opacity-40 group-hover:opacity-100 transition-opacity" />}
      </button>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center">
          <div
            data-testid="recap-year-picker-backdrop"
            className="absolute inset-0 bg-black/70"
            onClick={() => setPickerOpen(false)}
          />
          <div
            data-testid="recap-year-picker"
            className="relative w-full max-w-md bg-[#121212] border-t border-white/10 rounded-t-[32px] p-6 pb-10 flex flex-col gap-3"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.3em] text-accent-gold mb-1">{r.yearPickerTitle}</div>
            {list.map((y) => (
              <button
                key={y.year}
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  router.push(`/recap?year=${y.year}`);
                }}
                className="flex items-center justify-between h-14 px-5 rounded-2xl bg-white/5 border border-white/10 active:scale-[0.98] transition-transform"
              >
                <span className="text-lg font-black">{y.year}</span>
                <span className="text-xs text-text-desc">{fill(r.yearPickerCount, { n: y.count })}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
