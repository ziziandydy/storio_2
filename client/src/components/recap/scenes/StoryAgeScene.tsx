'use client';

import React from 'react';
import type { StoryAgeScene as StoryAgeData } from '@/lib/recap/types';
import { decadeLabel, fill } from '@/lib/recap/format';
import { CountText, StatLayout, type SceneProps } from './shared';

/** 年齡 0～1 歲（收藏的多半是今年或去年的新作）：顯示「0 歲」太尷尬，改用新鮮出爐的說法。 */
const FRESH_MAX_AGE = 1;

export default function StoryAgeScene({ data, copy, locale, aspectRatio, animate }: SceneProps<StoryAgeData>) {
  const s = copy.scene.storyAge;
  const fresh = data.age <= FRESH_MAX_AGE;
  return (
    <StatLayout
      aspectRatio={aspectRatio}
      testId="scene-story-age"
      eyebrow={s.title}
      headline={fresh ? s.fresh : <CountText template={s.age} value={data.age} animate={animate} />}
      lines={[
        fill(s.medianYear, { year: data.median_year }),
        data.favorite_decade != null && fill(s.decade, { decade: decadeLabel(data.favorite_decade, locale) }),
      ]}
    />
  );
}
