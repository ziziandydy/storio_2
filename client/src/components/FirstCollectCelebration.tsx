'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, Film } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { playSuccessHaptics } from '@/lib/haptics';

/** 彩帶播完後卸載節點的時間（毫秒）；CSS 動畫最長約 2.95 秒 */
export const CONFETTI_DURATION_MS = 3000;

const BURST_COUNT = 58;
const FALL_COUNT = 44;
const CONFETTI_COLORS = ['#c5a059', '#e6c98a', '#b69b7d', '#ffffff', '#8b5a2b'];

// 彩帶位置與色彩為固定演算（非隨機）：行為可重現、便於截圖比對。演算式沿用 mockup 9c「強」。
const BURST_PIECES = Array.from({ length: BURST_COUNT }, (_, k) => {
  const angle = (k / BURST_COUNT) * Math.PI * 2 + (k % 3) * 0.2;
  const dist = 120 + ((k * 37) % 95);
  return {
    background: CONFETTI_COLORS[k % CONFETTI_COLORS.length],
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist * 0.8 - 20),
    r: ((k * 53) % 540) - 270,
    delay: (k % 6) * 0.025,
  };
});

const FALL_PIECES = Array.from({ length: FALL_COUNT }, (_, k) => ({
  background: CONFETTI_COLORS[k % CONFETTI_COLORS.length],
  left: Math.round((((k * 29) % 100) * 0.94 + 3) * 10) / 10,
  r: ((k * 71) % 720) - 360,
  delay: Math.round((0.1 + (k % 10) * 0.05) * 100) / 100,
}));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** 海報＋右下金色勾勾（慶祝與訪客卡共用） */
export function PosterWithCheck({
  posterUrl, title, width, height, animated = false,
}: { posterUrl?: string; title: string; width: number; height: number; animated?: boolean }) {
  return (
    <div className={`relative shrink-0 ${animated ? 'fc-rise' : ''}`} style={{ width, height }}>
      {/* 光暈：靜態柔光常駐；慶祝時另有一層強光以 opacity 淡出 */}
      {animated && <div aria-hidden className="fc-glow absolute inset-0 rounded-xl shadow-[0_0_90px_rgba(197,160,89,0.65)]" />}
      <div className="relative w-full h-full rounded-xl overflow-hidden border border-accent-gold/60 shadow-[0_0_46px_rgba(197,160,89,0.32)] bg-folio-black">
        {posterUrl ? (
          // 外部海報網址不經 next/image（與 StoryCard 一致）
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-accent-gold/60">
            <Film size={32} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div
        data-testid="celebration-check"
        className={`absolute -bottom-3 -right-3 w-9 h-9 rounded-full bg-accent-gold text-black border-4 border-[#121212] flex items-center justify-center ${animated ? 'fc-pop' : ''}`}
      >
        <Check size={16} strokeWidth={3} />
      </div>
    </div>
  );
}

/** 「收藏成功」標題＋副文案（慶祝與訪客卡共用） */
export function SuccessHeading({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-[26px] font-black leading-tight text-white mb-2">{t.modals.successTitle}</h2>
      <p className="text-sm text-text-desc leading-relaxed">
        <span className="text-accent-gold font-bold">&quot;{title}&quot;</span> {t.modals.successMessage}
      </p>
    </div>
  );
}

interface FirstCollectCelebrationProps {
  /** 作品名稱 */
  title: string;
  posterUrl?: string;
  onContinue: () => void;
  onGoToCollection: () => void;
  /** 彩帶播完（約 3 秒）時呼叫 */
  onDone?: () => void;
  /**
   * 灑落彩帶的容器：由 modal 放在遮罩與卡片之間（全螢幕、pointer-events-none），
   * 讓彩帶從卡片後方經過。未提供時不渲染灑落彩帶。
   */
  fallLayerTarget?: HTMLElement | null;
}

/**
 * 第一部收藏的慶祝畫面（mockup 9c「強」）：整張卡閃金光、彩帶從海報炸開 58 片、
 * 畫面上方灑落 44 片（在卡片後方），約 3 秒後卸載彩帶節點；開始時觸發成功觸覺。
 * 動畫只用 CSS keyframes（transform／opacity），定義於 globals.css 的 `fc-*`。
 * prefers-reduced-motion：只留靜態光暈與勾勾，不渲染彩帶。
 */
export default function FirstCollectCelebration({
  title, posterUrl, onContinue, onGoToCollection, onDone, fallLayerTarget,
}: FirstCollectCelebrationProps) {
  const { t } = useTranslation();
  const [reducedMotion] = useState(prefersReducedMotion);
  const [confettiActive, setConfettiActive] = useState(() => !prefersReducedMotion());
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const hapticsPlayed = useRef(false);

  // 慶祝開始：觸覺只播一次
  useEffect(() => {
    if (hapticsPlayed.current) return;
    hapticsPlayed.current = true;
    void playSuccessHaptics();
  }, []);

  // 約 3 秒後卸載彩帶；元件提前卸載（中途關閉）時清掉計時器
  useEffect(() => {
    const id = setTimeout(() => {
      setConfettiActive(false);
      onDoneRef.current?.();
    }, CONFETTI_DURATION_MS);
    return () => clearTimeout(id);
  }, []);

  const showConfetti = confettiActive && !reducedMotion;

  return (
    <div
      data-testid="first-collect-celebration"
      className="relative rounded-[32px] px-8 pt-12 pb-8 flex flex-col items-center text-center gap-6"
      style={{ background: 'radial-gradient(ellipse at 50% 18%, rgba(197,160,89,0.20), transparent 62%), #121212' }}
    >
      {showConfetti && <i aria-hidden className="fc-flash absolute inset-0 rounded-[32px] pointer-events-none" />}

      <div className="relative">
        {showConfetti && (
          <div aria-hidden className="absolute left-1/2 top-1/2 pointer-events-none">
            {BURST_PIECES.map((p, k) => (
              <i
                key={k}
                data-confetti="burst"
                className="fc-burst absolute w-2 h-[14px] -ml-1 -mt-[7px] rounded-[2px]"
                style={{
                  background: p.background,
                  ['--tx' as string]: `${p.tx}px`,
                  ['--ty' as string]: `${p.ty}px`,
                  ['--r' as string]: `${p.r}deg`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            ))}
          </div>
        )}
        <PosterWithCheck posterUrl={posterUrl} title={title} width={116} height={174} animated={!reducedMotion} />
      </div>

      <SuccessHeading title={title} />

      <div className="grid grid-cols-2 gap-3 w-full mt-1">
        <button
          onClick={onContinue}
          className="py-4 bg-white/5 text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all"
        >
          {t.modals.continueBrowsing}
        </button>
        <button
          onClick={onGoToCollection}
          className="py-4 bg-accent-gold text-folio-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
        >
          {t.modals.goToMyStorio} <ArrowRight size={14} />
        </button>
      </div>

      {/* 灑落彩帶 portal 到 modal 在卡片後方預留的層：蓋滿畫面、在遮罩之上，但被卡片遮住 */}
      {showConfetti && fallLayerTarget &&
        createPortal(
          FALL_PIECES.map((p, k) => (
            <i
              key={k}
              data-confetti="fall"
              className="fc-fall absolute -top-6 w-2 h-[14px] rounded-[2px]"
              style={{
                background: p.background,
                left: `${p.left}%`,
                ['--r' as string]: `${p.r}deg`,
                animationDelay: `${p.delay}s`,
              }}
            />
          )),
          fallLayerTarget,
        )}
    </div>
  );
}
