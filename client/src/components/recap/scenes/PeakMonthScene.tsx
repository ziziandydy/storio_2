'use client';

import React from 'react';
import type { PeakMonthScene as PeakMonthData } from '@/lib/recap/types';
import { fill } from '@/lib/recap/format';
import { GOLD, StatLayout, type SceneProps } from './shared';

export default function PeakMonthScene({ data, copy, aspectRatio }: SceneProps<PeakMonthData>) {
  const monthName = copy.months[data.month - 1] ?? '';

  return (
    <StatLayout
      aspectRatio={aspectRatio}
      posters={data.posters}
      testId="scene-peak-month"
      eyebrow={copy.scene.peakMonth.title}
      headline={<span style={{ color: GOLD }}>{monthName}</span>}
      lines={[fill(copy.scene.peakMonth.count, { n: data.count })]}
    />
  );
}
