'use client';

import React from 'react';
import type { TimeSummary } from '@/lib/recap/types';
import { durationText, fill } from '@/lib/recap/format';
import CountUp from '../CountUp';
import { Pill, StatLayout, type SceneProps } from './shared';

export default function TotalScene({ data, copy, aspectRatio, animate }: SceneProps<TimeSummary>) {
  const showTime = data.items_with_data > 0;
  const time = fill(copy.scene.total.time, { time: durationText(copy.duration, data.minutes) });

  return (
    <StatLayout
      aspectRatio={aspectRatio}
      posters={data.posters}
      testId="scene-total"
      eyebrow={copy.scene.total.collected}
      headline={
        <>
          <span className="text-[96px]"><CountUp value={data.count} animate={animate} /></span>
          <span className="ml-2 text-[28px]">{copy.scene.total.unit}</span>
        </>
      }
      lines={[showTime && time]}
      badge={showTime && data.estimated ? <Pill>{copy.estimate}</Pill> : null}
    />
  );
}
