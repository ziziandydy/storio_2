'use client';

import React from 'react';
import { Search } from 'lucide-react';
import type { RecapCopy } from './scenes/shared';

const CSS = `
@keyframes recap-spin{to{transform:rotate(360deg)}}
@keyframes recap-breathe{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.07);opacity:1}}
.recap-loader-ring{animation:recap-spin 1.6s linear infinite}
.recap-loader-logo{animation:recap-breathe 2.4s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.recap-loader-ring,.recap-loader-logo{animation:none}}
`;

interface RecapContinueSlideProps {
  copy: RecapCopy;
  onContinue: () => void;
  /** 訪客登入提示等額外內容 */
  extra?: React.ReactNode;
}

/**
 * Recap 的最後一頁（只在 App 內預覽；輸出圖的結尾是 ClosingScene）：
 * Storio 標誌配轉圈的金色圓環與呼吸感，像載入動畫，下面是標語與「繼續收藏」。
 */
export default function RecapContinueSlide({ copy, onContinue, extra }: RecapContinueSlideProps) {
  return (
    <div
      data-testid="recap-continue-slide"
      className="flex flex-col items-center justify-center gap-7 text-center"
      style={{ width: 400, height: 711, background: '#0d0d0d', padding: '0 30px' }}
    >
      <style>{CSS}</style>
      <div style={{ position: 'relative', width: 148, height: 148 }}>
        <div
          data-testid="recap-loader-ring"
          className="recap-loader-ring"
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid rgba(197,160,89,0.18)', borderTopColor: '#c5a059',
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid="recap-loader-logo"
          className="recap-loader-logo"
          src="/image/logo/logo.png"
          alt="Storio"
          style={{ position: 'absolute', inset: 22, width: 104, height: 104, mixBlendMode: 'screen', borderRadius: '50%' }}
        />
      </div>
      <p className="text-[22px] font-black leading-snug">{copy.scene.closing.tagline}</p>
      <div data-no-nav className="flex w-full flex-col items-center gap-4">
        <button
          type="button"
          onClick={onContinue}
          className="flex h-14 items-center gap-2 rounded-full bg-accent-gold px-8 text-xs font-black tracking-widest text-folio-black"
        >
          <Search size={16} /> {copy.continueCollecting}
        </button>
        {extra}
      </div>
    </div>
  );
}
