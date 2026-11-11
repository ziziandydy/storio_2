'use client';

import React from 'react';
import { SCENE_SIZE, type RecapAspect } from '@/lib/recap/types';
import { posterSrc } from './posterSrc';

const MAX_POSTERS = 6;

interface SceneFrameProps {
  aspectRatio: RecapAspect;
  /** 背景海報（最多 6 張；沒有就只有純黑底） */
  posters?: string[];
  /** 底片邊（電影場景用） */
  filmEdge?: boolean;
  children: React.ReactNode;
}

/**
 * Recap 場景的外框：固定像素尺寸（預覽用 CSS 縮放、2B 的渲染服務直接截圖，所以預覽＝輸出）、
 * 純黑底＋清楚的海報背景＋中央襯底與文字陰影保證文字可讀、最上方置中的 Storio 標誌。
 */
export default function SceneFrame({ aspectRatio, posters, filmEdge, children }: SceneFrameProps) {
  const { w, h } = SCENE_SIZE[aspectRatio];
  const backdrop = (posters ?? []).slice(0, MAX_POSTERS);
  const columns = backdrop.length === 1 ? 1 : 2;

  return (
    <div
      data-testid="scene-frame"
      data-aspect={aspectRatio}
      style={{ width: `${w}px`, height: `${h}px`, position: 'relative', overflow: 'hidden', background: '#0d0d0d', color: '#fff' }}
    >
      {backdrop.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, display: 'grid', gridAutoRows: '1fr',
            gridTemplateColumns: `repeat(${columns}, 1fr)`, opacity: 0.85,
          }}
        >
          {backdrop.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${p}-${i}`} data-testid="scene-poster" alt="" {...posterSrc(p)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ))}
        </div>
      )}
      {/* 上下輕壓暗讓邊緣收斂，中段保持海報清楚；文字可讀性靠下方的中央襯底與文字陰影 */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(13,13,13,0.45) 0%, rgba(13,13,13,0.12) 38%, rgba(13,13,13,0.2) 62%, rgba(13,13,13,0.88) 100%)',
        }}
      />
      <div
        data-testid="scene-scrim"
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 90% 52% at 50% 50%, rgba(13,13,13,0.62) 0%, rgba(13,13,13,0.38) 55%, rgba(13,13,13,0) 100%)',
        }}
      />
      {filmEdge && (
        <>
          {(['left', 'right'] as const).map((side) => (
            <div
              key={side}
              data-film-edge
              aria-hidden="true"
              style={{
                position: 'absolute', top: 0, bottom: 0, [side]: 0, width: '14px', zIndex: 1,
                background: 'repeating-linear-gradient(180deg, #0d0d0d 0 14px, rgba(255,255,255,0.28) 14px 24px)',
                opacity: 0.7,
              }}
            />
          ))}
        </>
      )}
      <div
        data-testid="scene-content"
        style={{
          position: 'relative', zIndex: 2, height: '100%', padding: '84px 30px 36px',
          textShadow: '0 2px 14px rgba(0,0,0,0.75), 0 0 3px rgba(0,0,0,0.55)',
        }}
      >
        {children}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-testid="scene-logo"
        src="/image/logo/logo.png"
        alt="Storio"
        style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', width: '44px', height: '44px', zIndex: 3, mixBlendMode: 'screen' }}
      />
    </div>
  );
}
