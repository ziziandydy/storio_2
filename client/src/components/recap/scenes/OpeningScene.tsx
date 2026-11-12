'use client';

import React from 'react';
import SceneFrame from '../SceneFrame';
import { Eyebrow, GOLD, Pill, type SceneProps } from './shared';

export default function OpeningScene({ data, copy, aspectRatio, isPartial }: SceneProps<{ year: number }>) {
  return (
    <SceneFrame aspectRatio={aspectRatio}>
      <div data-testid="scene-opening" className="h-full flex flex-col items-center justify-center text-center gap-5">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <div className="text-[104px] leading-none font-black" style={{ color: GOLD }}>
          {data.year}
        </div>
        <div className="text-[22px] font-bold">{copy.scene.opening.title}</div>
        {isPartial && <Pill>{copy.partialBadge}</Pill>}
      </div>
    </SceneFrame>
  );
}
