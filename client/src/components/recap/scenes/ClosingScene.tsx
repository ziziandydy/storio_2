'use client';

import React from 'react';
import { DOWNLOAD_QR_PATH, STORE_LABELS } from '@/lib/recap/download';
import SceneFrame from '../SceneFrame';
import type { SceneProps } from './shared';

/** 依版面高度決定尺寸：9:16 的 logo 是主視覺（大），4:5 空間較小時等比縮小 */
const SIZES = {
  '9:16': { logo: 270, logoTop: 84, qr: 148, tagline: 22, gap: 24 },
  '4:5': { logo: 160, logoTop: 52, qr: 112, tagline: 18, gap: 12 },
} as const;

/** SceneFrame 內容層的上邊距（none 外框）：內容要從 logo 下方開始，需扣掉它 */
const CONTENT_TOP_PADDING = 84;

/**
 * 結尾場景：只用於分享圖（App 內預覽的最後一頁是「繼續收藏」），負責讓看到的人想下載。
 * Storio logo 放大成主視覺（logo 本身已含 STORIO 字樣，不再另放文字品牌），
 * 下面是標語、QR（指向下載）與商店名稱。
 */
export default function ClosingScene({ copy, aspectRatio }: SceneProps<Record<string, never>>) {
  const size = SIZES[aspectRatio];
  const contentTop = size.logoTop + size.logo + size.gap;

  return (
    <SceneFrame aspectRatio={aspectRatio} heroLogo={{ size: size.logo, top: size.logoTop }}>
      <div
        data-testid="scene-closing"
        className="flex flex-col items-center text-center"
        style={{ gap: `${size.gap}px`, paddingTop: `${Math.max(0, contentTop - CONTENT_TOP_PADDING)}px` }}
      >
        <div className="font-bold px-2" style={{ fontSize: `${size.tagline}px`, lineHeight: 1.3 }}>
          {copy.scene.closing.tagline}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid="closing-qr"
          src={DOWNLOAD_QR_PATH}
          alt={`${copy.scene.closing.download} QR`}
          style={{ width: `${size.qr}px`, height: `${size.qr}px`, background: '#fff', padding: '8px', borderRadius: '12px' }}
        />
        <div className="text-[13px] text-white/90">
          {copy.scene.closing.download} · {STORE_LABELS.join(' / ')}
        </div>
      </div>
    </SceneFrame>
  );
}
