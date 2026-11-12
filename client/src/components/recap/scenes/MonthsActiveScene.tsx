'use client';

import React from 'react';
import type { MonthsActiveScene as MonthsActiveData } from '@/lib/recap/types';
import { CountText, GOLD, StatLayout, type SceneProps, pickPosters } from './shared';

export default function MonthsActiveScene({ data, copy, aspectRatio, animate, backdrop }: SceneProps<MonthsActiveData>) {
  return (
    <StatLayout
      posters={pickPosters(data.posters, backdrop)}
      aspectRatio={aspectRatio}
      testId="scene-months-active"
      headline={
        <span className="text-[32px] leading-snug">
          <CountText template={copy.scene.monthsActive.text} value={data.count} animate={animate} numberColor={GOLD} numberTestId="months-active-n" />
        </span>
      }
    />
  );
}
