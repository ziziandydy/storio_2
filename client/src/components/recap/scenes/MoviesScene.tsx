'use client';

import React from 'react';
import type { TimeSummary } from '@/lib/recap/types';
import { durationText, fill } from '@/lib/recap/format';
import { CountText, StatLayout, type SceneProps } from './shared';

export default function MoviesScene({ data, copy, aspectRatio, animate }: SceneProps<TimeSummary>) {
  const time = fill(copy.scene.movies.time, { time: durationText(copy.duration, data.minutes) });

  return (
    <StatLayout
      aspectRatio={aspectRatio}
      posters={data.posters}
      filmEdge
      testId="scene-movies"
      eyebrow={copy.scene.movies.title}
      headline={<CountText template={copy.scene.movies.count} value={data.count} animate={animate} />}
      lines={[data.items_with_data > 0 && time]}
    />
  );
}
