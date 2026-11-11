'use client';

import React from 'react';
import type { GenreScene } from '@/lib/recap/types';
import { fill } from '@/lib/recap/format';
import SceneFrame from '../SceneFrame';
import { Eyebrow, GOLD, type SceneProps } from './shared';

export default function GenresScene({ data, copy, aspectRatio }: SceneProps<GenreScene>) {
  const max = Math.max(...data.top.map((g) => g.count), 1);

  return (
    <SceneFrame aspectRatio={aspectRatio} posters={data.posters}>
      <div data-testid="scene-genres" className="h-full flex flex-col justify-center gap-7">
        <div className="text-center">
          <Eyebrow>{copy.scene.genres.title}</Eyebrow>
        </div>
        <div className="flex flex-col gap-6">
          {data.top.map((genre, i) => (
            <div key={genre.name} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className={i === 0 ? 'text-[28px] font-black' : 'text-[20px] font-bold'}>{genre.name}</span>
                <span className="text-[14px] text-white/70">{fill(copy.scene.genres.count, { n: genre.count })}</span>
              </div>
              <div className="h-[10px] rounded-full bg-white/10 overflow-hidden">
                <div
                  data-testid="genre-bar"
                  className="h-full rounded-full"
                  style={{ width: `${Math.round((genre.count / max) * 100)}%`, background: GOLD, opacity: i === 0 ? 1 : 0.7 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}
