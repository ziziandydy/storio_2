'use client';

import React from 'react';
import type { TitleScene as TitleData } from '@/lib/recap/types';
import SceneFrame from '../SceneFrame';
import { Eyebrow, GOLD, type SceneProps } from './shared';

export default function TitleScene({ data, copy, locale, aspectRatio, backdrop }: SceneProps<TitleData>) {
  const title = locale === 'zh-TW' ? data.zh : data.en;
  // 英文稱號較長，字級縮小以維持兩行內
  const size = locale === 'zh-TW' ? 'text-[56px]' : 'text-[40px]';

  return (
    <SceneFrame aspectRatio={aspectRatio} posters={backdrop}>
      <div data-testid="scene-title" className="h-full flex flex-col items-center justify-center text-center gap-6">
        <Eyebrow>{copy.scene.title.eyebrow}</Eyebrow>
        <div className={`${size} leading-tight font-black px-2`} style={{ color: GOLD }}>
          {title}
        </div>
      </div>
    </SceneFrame>
  );
}
