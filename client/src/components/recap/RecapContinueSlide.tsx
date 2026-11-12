'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import type { RecapCopy } from './scenes/shared';

const LOADER_GIF = '/image/loading.gif';
const LOGO_STILL = '/image/logo/logo.png';

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
  /** 目前是否就是顯示這一頁；翻到時才開始播動畫（預設播放） */
  active?: boolean;
}

/**
 * Recap 的最後一頁（只在 App 內預覽；輸出圖的結尾是 ClosingScene）：
 * 翻到這一頁時播放 App 既有的 Storio 載入動畫（/image/loading.gif，與詳情頁等載入畫面相同），
 * 下面是標語與「繼續收藏」。
 * - 所有頁面一開始就掛載，若動畫一直在背景播，翻到時已經播到中途；所以沒翻到時只顯示靜態 logo，
 *   翻到時才換成「全新的」img 元素，GIF 才會從第一格開始完整播一輪（最後一頁不會自動前進，會一直循環）。
 * - 動畫素材提前預載，翻到時不用等下載。
 * - 背景與素材一致的純黑；「減少動態效果」時固定顯示靜態 logo。
 */
export default function RecapContinueSlide({ copy, onContinue, extra, active = true }: RecapContinueSlideProps) {
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (reduced) return;
    const preload = new Image();
    preload.src = LOADER_GIF;
  }, [reduced]);

  const playing = active && !reduced;

  return (
    <div
      data-testid="recap-continue-slide"
      className="flex flex-col items-center justify-center gap-6 text-center"
      style={{ width: 400, height: 711, background: '#000', padding: '0 24px' }}
    >
      {/* key 隨播放狀態改變：每次翻到都是新元素，GIF 從頭播 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={playing ? 'playing' : 'still'}
        data-testid="recap-loader"
        src={playing ? LOADER_GIF : LOGO_STILL}
        alt="Storio"
        style={{ width: 352, height: 198, objectFit: 'contain' }}
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
