'use client';

import React from 'react';
import type { StoryAgeScene as StoryAgeData } from '@/lib/recap/types';
import { decadeLabel, fill } from '@/lib/recap/format';
import { CountText, StatLayout, type SceneProps } from './shared';

export default function StoryAgeScene({ data, copy, locale, aspectRatio, animate }: SceneProps<StoryAgeData>) {
  return (
    <StatLayout
      aspectRatio={aspectRatio}
      testId="scene-story-age"
      eyebrow={copy.scene.storyAge.title}
      headline={<CountText template={copy.scene.storyAge.age} value={Math.max(0, data.age)} animate={animate} />}
      lines={[fill(copy.scene.storyAge.decade, { decade: decadeLabel(data.favorite_decade, locale) })]}
    />
  );
}
