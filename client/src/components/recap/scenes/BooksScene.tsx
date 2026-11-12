'use client';

import React from 'react';
import type { BooksScene as BooksData } from '@/lib/recap/types';
import { durationText, fill } from '@/lib/recap/format';
import { CountText, StatLayout, type SceneProps } from './shared';

export default function BooksScene({ data, copy, aspectRatio, animate }: SceneProps<BooksData>) {
  const time = fill(copy.scene.books.time, { time: durationText(copy.duration, data.minutes) });

  return (
    <StatLayout
      aspectRatio={aspectRatio}
      posters={data.posters}
      frame="book"
      testId="scene-books"
      eyebrow={copy.scene.books.title}
      headline={<CountText template={copy.scene.books.count} value={data.count} animate={animate} />}
      lines={[
        data.pages > 0 && fill(copy.scene.books.pages, { n: data.pages }),
        data.items_with_data > 0 && time,
      ]}
    />
  );
}
