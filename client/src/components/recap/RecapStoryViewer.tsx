'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

/** 預設每一頁停留時間（毫秒）。 */
const DEFAULT_DURATION_MS = 5000;
/** 按住超過這麼久才算「長按暫停」，否則是點一下。 */
const HOLD_MS = 200;
/** 點畫面左側這個比例以內是「上一頁」，其餘是「下一頁」（與 Instagram 限時動態相同）。 */
const PREV_ZONE = 0.33;

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** 進度條填色；動畫結束用原生 animationend 監聽（React 的 onAnimationEnd 在沒有 AnimationEvent 的環境收不到）。 */
function ProgressFill({ style, onEnd }: { style: React.CSSProperties; onEnd: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = () => onEndRef.current();
    el.addEventListener('animationend', handler);
    return () => el.removeEventListener('animationend', handler);
  }, []);
  return <div ref={ref} data-testid="story-progress-fill" className="h-full bg-white" style={style} />;
}

interface RecapStoryViewerProps {
  /** 頁數 */
  count: number;
  /** 每頁的設計尺寸（預設 400×711，即 9:16 的場景）；內容以 CSS 縮放貼合可用空間 */
  designSize?: { w: number; h: number };
  /** 渲染第 i 頁；active 表示目前顯示的這一頁（用來啟動數字動畫等） */
  renderSlide: (index: number, active: boolean) => React.ReactNode;
  /** 每頁停留時間（毫秒），可依頁數給不同值 */
  durationMs?: number | ((index: number) => number);
  /** 頁首（返回、年份…），放在進度條下方；互動元素需加 data-no-nav */
  header?: React.ReactNode;
  /** 頁尾（分享…）；互動元素需加 data-no-nav */
  footer?: React.ReactNode;
  /** 外部要求暫停（例如分享面板開著） */
  paused?: boolean;
  onIndexChange?: (index: number) => void;
}

/**
 * 限時動態式的 Recap 瀏覽：整頁固定在視窗內不可捲動、頂端分段進度條、點右側下一頁／左側上一頁、
 * 按住暫停、自動前進（最後一頁停住；用戶開啟「減少動態效果」時不自動前進）。
 * 所有頁都先掛載（只顯示目前這頁），切換時海報已載入、不閃爍。
 */
export default function RecapStoryViewer({
  count, designSize = { w: 400, h: 711 }, renderSlide, durationMs = DEFAULT_DURATION_MS,
  header, footer, paused = false, onIndexChange,
}: RecapStoryViewerProps) {
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0); // 回上一頁停在同一頁時，讓進度條重新開始
  const [holding, setHolding] = useState(false);
  const [scale, setScale] = useState(1);
  const [reduced] = useState(prefersReducedMotion);
  const stageRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      setCycle((c) => c + 1);
      setIndex((current) => {
        if (clamped !== current) onIndexChange?.(clamped);
        return clamped;
      });
    },
    [count, onIndexChange],
  );

  // 場景固定 400×711：依可用空間縮放（寬、高都要放得下）
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setScale(Math.min(w / designSize.w, h / designSize.h));
    };
    fit();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    observer?.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [designSize.w, designSize.h]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }, []);

  const startHold = () => {
    heldRef.current = false;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      heldRef.current = true;
      setHolding(true);
    }, HOLD_MS);
  };
  const endHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false); // heldRef 留給緊接著的 click 判斷「這是長按放開，不是點擊」
  };

  const onStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return;
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const x = e.clientX - rect.left;
    go(x < width * PREV_ZONE ? index - 1 : index + 1);
  };

  const durationFor = (i: number) => (typeof durationMs === 'function' ? durationMs(i) : durationMs);
  const lastIndex = count - 1;
  const playState = holding || paused ? 'paused' : 'running';

  return (
    <div
      data-testid="story-viewer"
      className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-black text-white select-none"
      style={{ touchAction: 'manipulation', overscrollBehavior: 'none' }}
    >
      <style>{'@keyframes recap-story-fill{from{width:0}to{width:100%}}'}</style>

      <div className="shrink-0" style={{ paddingTop: 'calc(var(--sa-top, 0px) + 10px)' }}>
        <div className="flex gap-1 px-3" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => {
            const animated = i === index && i !== lastIndex && !reduced;
            const style: React.CSSProperties =
              i < index || (i === index && !animated)
                ? { width: '100%' }
                : i === index
                  ? {
                      width: '0%',
                      animationName: 'recap-story-fill',
                      animationDuration: `${durationFor(i)}ms`,
                      animationTimingFunction: 'linear',
                      animationFillMode: 'forwards',
                      animationPlayState: playState,
                    }
                  : { width: '0%' };
            return (
              <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                <ProgressFill
                  key={`${i}-${i === index ? cycle : 0}`}
                  style={style}
                  onEnd={() => {
                    if (i === index) go(index + 1);
                  }}
                />
              </div>
            );
          })}
        </div>
        {header}
      </div>

      <div
        ref={stageRef}
        data-testid="story-stage"
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={onStageClick}
        onPointerDown={startHold}
        onPointerUp={endHold}
        onPointerCancel={endHold}
        onPointerLeave={endHold}
      >
        {Array.from({ length: count }, (_, i) => {
          const active = i === index;
          return (
            <div
              key={i}
              data-testid={`story-slide-${i}`}
              className="absolute inset-0 flex items-center justify-center"
              style={{ visibility: active ? 'visible' : 'hidden' }}
              aria-hidden={!active}
            >
              <div style={{ width: designSize.w * scale, height: designSize.h * scale, position: 'relative' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: designSize.w, height: designSize.h }}>
                  {renderSlide(i, active)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        {footer}
      </div>
    </div>
  );
}
