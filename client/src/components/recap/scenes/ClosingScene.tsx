'use client';

import React from 'react';
import { DOWNLOAD_QR_PATH, STORE_LABELS } from '@/lib/recap/download';
import SceneFrame from '../SceneFrame';
import { GOLD, type SceneProps } from './shared';

/** 結尾場景：只用於分享圖（App 內預覽的最後一頁是「繼續收藏」），負責讓看到的人想下載。 */
export default function ClosingScene({ copy, aspectRatio }: SceneProps<Record<string, never>>) {
  return (
    <SceneFrame aspectRatio={aspectRatio}>
      <div data-testid="scene-closing" className="h-full flex flex-col items-center justify-center text-center gap-5">
        <div className="text-[44px] leading-none font-black tracking-[0.2em]" style={{ color: GOLD }}>
          STORIO
        </div>
        <div className="text-[17px] font-bold px-2">{copy.scene.closing.tagline}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-testid="closing-qr"
          src={DOWNLOAD_QR_PATH}
          alt={`${copy.scene.closing.download} QR`}
          style={{ width: '140px', height: '140px', background: '#fff', padding: '8px', borderRadius: '12px' }}
        />
        <div className="text-[13px] text-white/75">
          {copy.scene.closing.download} · {STORE_LABELS.join(' / ')}
        </div>
      </div>
    </SceneFrame>
  );
}
