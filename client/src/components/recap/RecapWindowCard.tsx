'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRecapEntry } from '@/hooks/useRecapEntry';
import { dismiss } from '@/lib/recap/entry';
import { fill } from '@/lib/recap/format';

/**
 * Profile 置頂的限時 Recap 卡片：11 月 1 日至隔年 2 月底顯示（11–12 月對應當年，1–2 月對應去年），
 * 只有對應年份達門檻且用戶沒有關閉過該年時才出現。
 * 關閉（X）後卡片與首頁頭像外框一併消失，Profile 的常駐列接手並提示「之後可從這裡查看」。
 * 關閉狀態依年份記在 localStorage；localStorage 失敗時退化為每次顯示，但本次工作階段內仍會隱藏。
 */
export default function RecapWindowCard({ today }: { today?: Date }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { year, active } = useRecapEntry(today);

  if (!active || year == null) return null;

  const r = t.recap;

  return (
    <div className="w-full mb-6" data-testid="recap-window-card">
      <div
        className="relative rounded-3xl border border-accent-gold/30"
        style={{ background: 'linear-gradient(180deg, rgba(197,160,89,0.14), rgba(197,160,89,0.03))' }}
      >
        <button
          type="button"
          onClick={() => router.push(`/recap?year=${year}`)}
          className="w-full text-left p-6 pr-12 flex flex-col gap-3 active:scale-[0.99] transition-transform"
        >
          <span className="text-[10px] font-black tracking-[0.3em] text-accent-gold">{r.eyebrow}</span>
          <span className="text-[22px] font-black leading-tight">{fill(r.windowCardTitle, { year })}</span>
          <span className="text-[13px] text-text-desc">{r.windowCardBody}</span>
          <span className="mt-1 inline-flex items-center gap-2 text-xs font-black tracking-widest text-accent-gold">
            {r.windowCardCta} <ArrowRight size={14} />
          </span>
        </button>
        <button
          type="button"
          aria-label={r.dismiss}
          onClick={() => dismiss(year)}
          className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
