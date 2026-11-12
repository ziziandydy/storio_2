'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import type { RecapCopy } from './scenes/shared';

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

interface RecapContinueSlideProps {
  copy: RecapCopy;
  onContinue: () => void;
  /** 訪客登入提示等額外內容 */
  extra?: React.ReactNode;
}

/**
 * Recap 的最後一頁（只在 App 內預覽；輸出圖的結尾是 ClosingScene）：
 * 播放 App 既有的 Storio 載入動畫（/image/loading.gif，與詳情頁等載入畫面相同），
 * 下面是標語與「繼續收藏」。背景與動畫素材一致的純黑；「減少動態效果」時改顯示靜態 logo。
 */
export default function RecapContinueSlide({ copy, onContinue, extra }: RecapContinueSlideProps) {
  const [reduced] = useState(prefersReducedMotion);

  return (
    <div
      data-testid="recap-continue-slide"
      className="flex flex-col items-center justify-center gap-6 text-center"
      style={{ width: 400, height: 711, background: '#000', padding: '0 24px' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-testid="recap-loader"
        src={reduced ? '/image/logo/logo.png' : '/image/loading.gif'}
        alt="Storio"
        style={reduced ? { width: 160, height: 160, objectFit: 'contain' } : { width: 352, height: 198, objectFit: 'contain' }}
      />
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
