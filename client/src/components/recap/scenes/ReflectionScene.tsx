'use client';

import React from 'react';
import type { ReflectionScene as ReflectionData } from '@/lib/recap/types';
import { fill } from '@/lib/recap/format';
import { reflectionCandidate } from '@/lib/recap/reflection';
import SceneFrame from '../SceneFrame';
import { Eyebrow, GOLD, type SceneProps, pickPosters } from './shared';

export default function ReflectionScene({
  data, copy, aspectRatio, backdrop, reflectionIndex = 0,
}: SceneProps<ReflectionData> & { reflectionIndex?: number }) {
  const pick = reflectionCandidate(data, reflectionIndex);
  const countText = data.count === 1 ? copy.scene.reflection.countOne : fill(copy.scene.reflection.count, { n: data.count });

  return (
    <SceneFrame aspectRatio={aspectRatio} posters={pickPosters(pick?.poster_path ? [pick.poster_path] : undefined, backdrop)}>
      <div data-testid="scene-reflection" className="h-full flex flex-col items-center justify-center text-center gap-6">
        <Eyebrow>{copy.scene.reflection.title}</Eyebrow>
        {pick && (
          <>
            <div className="text-[28px] leading-snug font-bold px-2">「{pick.text}」</div>
            <div className="text-[14px] text-white/70">
              {pick.title}
              {pick.rating > 0 && <span style={{ color: GOLD }}> · {fill(copy.scene.topRated.rating, { n: pick.rating })}</span>}
            </div>
          </>
        )}
        <div className="text-[13px] text-white/55">{countText}</div>
      </div>
    </SceneFrame>
  );
}
