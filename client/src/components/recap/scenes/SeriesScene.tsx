'use client';

import React from 'react';
import type { SeriesScene as SeriesData } from '@/lib/recap/types';
import { durationText, fill } from '@/lib/recap/format';
import { CountText, StatLayout, type SceneProps } from './shared';

export default function SeriesScene({ data, copy, aspectRatio, animate }: SceneProps<SeriesData>) {
  const time = fill(copy.scene.series.time, { time: durationText(copy.duration, data.minutes) });

  return (
    <StatLayout
      aspectRatio={aspectRatio}
      posters={data.posters}
      testId="scene-series"
      eyebrow={copy.scene.series.title}
      headline={<CountText template={copy.scene.series.count} value={data.count} animate={animate} />}
      lines={[
        data.episodes > 0 && fill(copy.scene.series.episodes, { n: data.episodes }),
        data.items_with_data > 0 && time,
      ]}
    />
  );
}
