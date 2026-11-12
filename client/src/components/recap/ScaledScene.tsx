'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SCENE_SIZE, type RecapAspect, type RecapData, type RecapLocale, type SceneKey } from '@/lib/recap/types';
import RecapScene from './RecapScene';
import type { RecapCopy } from './scenes/shared';

/** 還沒量到寬度前的假設寬度（約三欄縮圖），避免第一幀是 scale(0) */
const FALLBACK_WIDTH = 110;

function useElementWidth(ref: React.RefObject<HTMLElement>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [ref]);
  return width;
}

interface ScaledSceneProps {
  sceneKey: SceneKey;
  recap: RecapData;
  copy: RecapCopy;
  locale: RecapLocale;
  aspectRatio: RecapAspect;
  reflectionIndex: number;
  /** 捲到可視範圍才掛載（分享面板的 15 個縮圖用）；掛過就保留 */
  lazy?: boolean;
}

/**
 * 把「真正的場景元件」等比縮小成縮圖（400×711 或 400×500 的場景用 CSS scale 縮到容器寬度）。
 * 不送去伺服器渲染：分享面板的縮圖不再需要 15 次 Puppeteer 截圖，也不用等圖片服務冷啟動；
 * 輸出圖用同一批元件渲染，所以縮圖＝輸出（除了瀏覽器引擎的細微差異）。
 */
export default function ScaledScene({ sceneKey, recap, copy, locale, aspectRatio, reflectionIndex, lazy = false }: ScaledSceneProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef);
  const [visible, setVisible] = useState(!lazy || typeof IntersectionObserver === 'undefined');
  const { w, h } = SCENE_SIZE[aspectRatio];
  const scale = (width || FALLBACK_WIDTH) / w;

  useEffect(() => {
    if (visible || !boxRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={boxRef}
      data-testid="scaled-scene"
      aria-hidden="true"
      className={`relative w-full overflow-hidden ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[4/5]'}`}
      style={{ pointerEvents: 'none' }}
    >
      {visible && (
        <div
          data-testid="scaled-scene-inner"
          style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <RecapScene
            sceneKey={sceneKey}
            recap={recap}
            copy={copy}
            locale={locale}
            aspectRatio={aspectRatio}
            animate={false}
            reflectionIndex={reflectionIndex}
          />
        </div>
      )}
    </div>
  );
}
