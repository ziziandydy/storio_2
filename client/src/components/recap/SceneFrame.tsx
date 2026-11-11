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
 * 純黑底＋低透明度海報背景＋暗色漸層保證文字可讀、角落 Storio 標誌。
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
            gridTemplateColumns: `repeat(${columns}, 1fr)`, opacity: 0.4,
          }}
        >
          {backdrop.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${p}-${i}`} data-testid="scene-poster" alt="" {...posterSrc(p)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(0.8)' }} />
          ))}
        </div>
      )}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(13,13,13,0.55) 0%, rgba(13,13,13,0.82) 55%, #0d0d0d 100%)',
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
      <div style={{ position: 'relative', zIndex: 2, height: '100%', padding: '36px 30px' }}>{children}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-testid="scene-logo"
        src="/image/logo/logo.png"
        alt="Storio"
        style={{ position: 'absolute', top: '16px', right: '18px', width: '28px', height: '28px', zIndex: 3, opacity: 0.9 }}
      />
    </div>
  );
}
