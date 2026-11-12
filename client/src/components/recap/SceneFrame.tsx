'use client';

import React from 'react';
import { SCENE_SIZE, type RecapAspect } from '@/lib/recap/types';
import PosterImage from './PosterImage';

const MAX_POSTERS = 48; // 總數場景的海報牆：6 欄 × 8 列，每張約 67×89；再多每張太小
/** 超過這個張數就算「密集牆」：改用較小的縮圖（w154）並依畫面比例挑欄數 */
const DENSE_AFTER = 12;
/** 文字帶的失焦程度與範圍（百分比是畫面高度）：約 34%～78% 完整失焦，上下各約 18% 羽化 */
const FOCUS_BLUR_PX = 10;
const FOCUS_MASK = 'linear-gradient(180deg, transparent 16%, #000 34%, #000 78%, transparent 92%)';

interface SceneFrameProps {
  aspectRatio: RecapAspect;
  /** 背景海報（最多 48 張；沒有就只有純黑底） */
  posters?: string[];
  /** 媒體專屬外框：電影＝底片邊、影集＝電視螢幕、書＝書本；其他場景不加 */
  frame?: RecapFrame;
  /** 主視覺 logo（結尾場景）：放大並取代最上方的小標誌。放在內容層之外，混合模式才吃得到背景 */
  heroLogo?: { size: number; top: number };
  children: React.ReactNode;
}

export type RecapFrame = 'film' | 'tv' | 'book';

/** 各外框的內容邊距（讓文字避開外框） */
const CONTENT_PADDING: Record<RecapFrame | 'none', string> = {
  none: '84px 30px 36px',
  film: '84px 36px 36px',
  tv: '88px 44px 48px',
  book: '84px 40px 40px 56px',
};

/**
 * 海報牆的欄數：
 * - 12 張以內：1 張滿版、2／4 張兩欄、3 與 5～9 張三欄、10 張以上四欄（每張都夠大）。
 * - 超過 12 張（密集牆）：挑讓每格最接近海報比例（高／寬 = 1.5）的欄數，所以矮的 4:5 畫面欄數會比 9:16 多。
 */
function gridColumns(count: number, w: number, h: number): number {
  if (count <= 1) return 1;
  if (count <= DENSE_AFTER) return count === 2 || count === 4 ? 2 : count <= 9 ? 3 : 4;
  let best = 4;
  let bestDiff = Infinity;
  for (let c = 4; c <= 9; c++) {
    const diff = Math.abs(h / Math.ceil(count / c) / (w / c) - 1.5);
    if (diff < bestDiff) {
      best = c;
      bestDiff = diff;
    }
  }
  return best;
}

function FrameOverlay({ frame }: { frame: RecapFrame }) {
  if (frame === 'film') {
    return (
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
    );
  }
  if (frame === 'tv') {
    // 電視螢幕：圓角螢幕周圍是深色機殼（用超大的外擴陰影填滿螢幕以外的區域）、金色細框、掃描線、右下電源燈
    return (
      <>
        <div
          data-tv-bezel
          aria-hidden="true"
          style={{
            position: 'absolute', inset: '14px', zIndex: 1, pointerEvents: 'none', borderRadius: '40px',
            border: '2px solid rgba(197,160,89,0.75)',
            boxShadow: '0 0 0 400px #0a0a0a, inset 0 0 50px rgba(0,0,0,0.55)',
            backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 4px)',
          }}
        />
        <div
          data-tv-led
          aria-hidden="true"
          style={{
            position: 'absolute', right: '34px', bottom: '4px', width: '6px', height: '6px', borderRadius: '50%', zIndex: 2,
            background: '#c5a059', boxShadow: '0 0 8px 2px rgba(197,160,89,0.8)',
          }}
        />
      </>
    );
  }
  // 書本：左側皮革書脊（金色縫線）、右側書頁邊（細密的頁緣）、上下封面邊
  return (
    <>
      <div
        data-book-spine
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '34px', zIndex: 1,
          background: 'linear-gradient(90deg, #17100a 0%, #2b1d12 55%, #1a120b 100%)',
          boxShadow: 'inset -6px 0 10px rgba(0,0,0,0.6), 3px 0 10px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ position: 'absolute', left: '22px', top: '14px', bottom: '14px', borderLeft: '2px dashed rgba(197,160,89,0.75)' }} />
      </div>
      <div
        data-book-pages
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, bottom: 0, right: 0, width: '14px', zIndex: 1,
          background: 'repeating-linear-gradient(90deg, rgba(240,232,214,0.95) 0px, rgba(240,232,214,0.95) 1px, rgba(190,178,150,0.9) 1px, rgba(190,178,150,0.9) 3px)',
          boxShadow: 'inset 6px 0 10px rgba(0,0,0,0.45)',
        }}
      />
      {(['top', 'bottom'] as const).map((edge) => (
        <div
          key={edge}
          data-book-cover
          aria-hidden="true"
          style={{ position: 'absolute', left: 0, right: 0, [edge]: 0, height: '8px', zIndex: 1, background: '#17100a' }}
        />
      ))}
    </>
  );
}

/**
 * Recap 場景的外框：固定像素尺寸（預覽用 CSS 縮放、2B 的渲染服務直接截圖，所以預覽＝輸出）、
 * 純黑底＋清楚的海報背景＋中央襯底與文字陰影保證文字可讀、最上方置中的 Storio 標誌。
 */
export default function SceneFrame({ aspectRatio, posters, frame, heroLogo, children }: SceneFrameProps) {
  const { w, h } = SCENE_SIZE[aspectRatio];
  const unique = (posters ?? []).slice(0, MAX_POSTERS);
  const columns = gridColumns(unique.length, w, h);
  // 最後一列不滿時用前面的海報循環補滿，不留空格
  const total = unique.length === 0 ? 0 : Math.ceil(unique.length / columns) * columns;
  const backdrop = Array.from({ length: total }, (_, i) => unique[i % unique.length]);

  return (
    <div
      data-testid="scene-frame"
      data-aspect={aspectRatio}
      data-frame={frame}
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
            // 背景海報：經 posterLoader 驗證成功才顯示（直連 CDN → 代理 → 預設海報），絕不破圖
            <PosterImage key={`${p}-${i}`} path={p} size={unique.length > DENSE_AFTER ? 'w154' : undefined} testId="scene-poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          background: 'radial-gradient(ellipse 90% 52% at 50% 50%, rgba(13,13,13,0.42) 0%, rgba(13,13,13,0.24) 55%, rgba(13,13,13,0) 100%)',
        }}
      />
      {backdrop.length > 0 && (
        // 文字帶：海報自己的細節（大字、人臉、高對比邊緣）會和場景文字互相干擾，所以在文字所在的中央區域
        // 失焦並壓暗（Lens Blur Depth），上下緣羽化，海報兩端維持清楚。必須在文字層之下、海報與漸層之上。
        <div
          data-testid="scene-focus"
          data-focus-blur={`${FOCUS_BLUR_PX}px`}
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            backdropFilter: `blur(${FOCUS_BLUR_PX}px) brightness(0.88) saturate(1.1)`,
            WebkitBackdropFilter: `blur(${FOCUS_BLUR_PX}px) brightness(0.88) saturate(1.1)`,
            maskImage: FOCUS_MASK,
            WebkitMaskImage: FOCUS_MASK,
          }}
        />
      )}
      {frame && <FrameOverlay frame={frame} />}
      <div
        data-testid="scene-content"
        style={{
          position: 'relative', zIndex: 2, height: '100%', padding: CONTENT_PADDING[frame ?? 'none'],
          textShadow: '0 2px 14px rgba(0,0,0,0.75), 0 0 3px rgba(0,0,0,0.55)',
        }}
      >
        {children}
      </div>
      {heroLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          data-testid="closing-logo"
          src="/image/logo/logo.png"
          alt="Storio"
          style={{
            position: 'absolute', top: `${heroLogo.top}px`, left: '50%', transform: 'translateX(-50%)',
            width: `${heroLogo.size}px`, height: `${heroLogo.size}px`, zIndex: 3, mixBlendMode: 'screen', borderRadius: '50%',
            // 邊緣羽化：素材的底色比場景背景略亮，不柔化的話會形成一圈圓盤；徽章（距中心約 80%）不受影響
            WebkitMaskImage: 'radial-gradient(circle closest-side, #000 84%, transparent 100%)',
            maskImage: 'radial-gradient(circle closest-side, #000 84%, transparent 100%)',
          }}
        />
      ) : (
        <>
          {/* 菱形柔化襯底：跟 logo 的菱形同形，只把它後方的海報模糊、邊緣羽化，不填黑、不做光暈或圓盤 */}
          <div
            data-testid="scene-logo-backdrop"
            aria-hidden="true"
            style={{
              position: 'absolute', top: '44px', left: '50%', width: '50px', height: '50px', zIndex: 2,
              transform: 'translateX(-50%) rotate(45deg) scale(1.3)',
              // 只模糊 logo 後方的海報（不填黑色）；邊緣羽化讓菱形範圍自然融進背景
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
              maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)',
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="scene-logo"
            src="/image/logo/logo.png"
            alt="Storio"
            style={{
              position: 'absolute', top: '26px', left: '50%', transform: 'translateX(-50%)', width: '68px', height: '68px', zIndex: 3,
              // 素材自帶圓形黑底：裁成菱形（跟 logo 本體同形），黑色圓角就不會露出來；不用 screen 混合（會在亮海報上淡掉）
              clipPath: 'polygon(50% 5%, 95% 50%, 50% 95%, 5% 50%)',
            }}
          />
        </>
      )}
    </div>
  );
}
