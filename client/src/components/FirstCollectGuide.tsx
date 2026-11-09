'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import HomeStats from '@/components/HomeStats';
import { useTranslation } from '@/hooks/useTranslation';
import { useCollectionCount } from '@/hooks/useCollectionCount';

/** 館藏為 0 的新用戶引導區：搜尋入口刻意用按鈕，進搜尋頁後再對焦輸入框 */
export default function FirstCollectGuide() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const g = t.firstCollect;
  // 英文標題較長，字級縮小以維持單行
  const isEn = locale === 'en-US';

  return (
    <div className="w-full max-w-md mx-auto px-6" data-testid="first-collect-guide">
      <div
        className="rounded-3xl border border-accent-gold/30 p-6 flex flex-col gap-4"
        style={{ background: 'linear-gradient(180deg, rgba(197,160,89,0.14), rgba(197,160,89,0.03))' }}
      >
        <div className="text-[10px] font-black tracking-[0.3em] text-accent-gold">{g.eyebrow}</div>
        <div className={`${isEn ? 'text-[22px]' : 'text-[26px]'} font-black leading-tight whitespace-nowrap`}>
          {g.title}
        </div>
        <button
          type="button"
          onClick={() => router.push('/search?focus=1')}
          className="h-14 rounded-full bg-accent-gold text-folio-black text-xs font-black tracking-widest flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(233,108,38,0.35)] hover:bg-white active:scale-95 transition-all whitespace-nowrap"
        >
          <Search size={18} />
          <span>{g.searchButton}</span>
        </button>
        <p className="text-[13px] text-text-desc leading-relaxed text-center -mt-1 whitespace-nowrap">{g.hint}</p>
      </div>
    </div>
  );
}

/** 首頁統計區：館藏為 0 顯示引導區；載入中兩者皆不顯示；失敗（null）或 >=1 維持原本統計＋檢視按鈕 */
export function HomeCollectionArea() {
  const { t } = useTranslation();
  const { count, loading } = useCollectionCount();

  if (loading) return <div className="min-h-[160px]" aria-hidden="true" />;
  if (count === 0) return <FirstCollectGuide />;

  return (
    <div className="flex flex-col items-center gap-12">
      <HomeStats />

      <div className="flex gap-4">
        <Link
          href="/collection"
          className="group px-8 py-4 bg-accent-gold text-folio-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-[0_0_30px_rgba(233,108,38,0.4)] flex items-center gap-2"
        >
          {t.home.viewStorio} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
