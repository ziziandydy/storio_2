'use client';

import React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useRecapEntry } from '@/hooks/useRecapEntry';

/**
 * 首頁右上角的頭像（連到 /profile）。限時 Recap 期間（窗口內、對應年份達標、未關閉）
 * 外圍加金色細框，下緣貼一枚「Recap」小膠囊；關閉卡片後外框與膠囊一起消失。
 * 膠囊放在 Link 外層：Link 有 overflow-hidden 會把掛在邊緣的元素切掉。
 */
export default function RecapAvatarLink({ avatarUrl, today }: { avatarUrl?: string; today?: Date }) {
  const { t } = useTranslation();
  const { active } = useRecapEntry(today);

  return (
    <div className="relative">
      <Link
        href="/profile"
        data-testid="recap-avatar-link"
        data-recap={active ? 'on' : 'off'}
        className={`w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur flex items-center justify-center transition-all hover:scale-105 active:scale-95 group overflow-hidden ${
          active
            ? 'border-2 border-accent-gold shadow-[0_0_0_3px_rgba(197,160,89,0.18)]'
            : 'border border-white/10'
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <User size={16} className="text-white/70 group-hover:text-white transition-colors" />
        )}
      </Link>
      {active && (
        <span
          data-testid="recap-avatar-badge"
          className="pointer-events-none absolute left-1/2 -bottom-2 -translate-x-1/2 rounded-full bg-accent-gold px-1.5 py-px text-[8.5px] font-black leading-tight tracking-wide text-folio-black whitespace-nowrap"
        >
          {t.recap.avatarBadge}
        </span>
      )}
    </div>
  );
}
