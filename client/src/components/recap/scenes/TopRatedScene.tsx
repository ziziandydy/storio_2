'use client';

import React from 'react';
import type { TopRatedScene as TopRatedData } from '@/lib/recap/types';
import { fill } from '@/lib/recap/format';
import SceneFrame from '../SceneFrame';
import { posterSrc } from '../posterSrc';
import { Eyebrow, GOLD, type SceneProps } from './shared';

const MAX_ITEMS = 3;

export default function TopRatedScene({ data, copy, aspectRatio }: SceneProps<TopRatedData>) {
  const countText = data.count === 1 ? copy.scene.topRated.countOne : fill(copy.scene.topRated.count, { n: data.count });

  return (
    <SceneFrame aspectRatio={aspectRatio}>
      <div data-testid="scene-top-rated" className="h-full flex flex-col items-center justify-center text-center gap-5">
        <Eyebrow>{copy.scene.topRated.title}</Eyebrow>
        <div className="text-[72px] leading-none font-black" style={{ color: GOLD }}>
          {fill(copy.scene.topRated.rating, { n: data.rating })}
        </div>
        <div className="flex gap-3 justify-center">
          {data.items.slice(0, MAX_ITEMS).map((item, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} data-testid="top-rated-poster" alt={item.title ?? ''} {...posterSrc(item.poster_path)}
              style={{ width: '96px', height: '144px', objectFit: 'cover', borderRadius: '8px' }} />
          ))}
        </div>
        <div className="text-[18px] font-medium text-white/85">{countText}</div>
      </div>
    </SceneFrame>
  );
}
