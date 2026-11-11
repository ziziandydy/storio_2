'use client';

import React from 'react';
import type { FirstLastItem, FirstLastScene as FirstLastData } from '@/lib/recap/types';
import { formatArchivedDate } from '@/lib/dateUtils';
import SceneFrame from '../SceneFrame';
import { posterSrc } from '../posterSrc';
import { Eyebrow, GOLD, type SceneProps } from './shared';

function Entry({ label, item, locale }: { label: string; item: FirstLastItem; locale: 'zh-TW' | 'en-US' }) {
  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={item.title ?? ''} {...posterSrc(item.poster_path)}
        style={{ width: '72px', height: '108px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
      <div className="flex flex-col gap-1 text-left min-w-0">
        <span className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: GOLD }}>{label}</span>
        {item.title && <span className="text-[20px] font-bold leading-snug">{item.title}</span>}
        {item.date && <span className="text-[13px] text-white/65">{formatArchivedDate(item.date, locale)}</span>}
      </div>
    </div>
  );
}

export default function FirstLastScene({ data, copy, locale, aspectRatio }: SceneProps<FirstLastData>) {
  return (
    <SceneFrame aspectRatio={aspectRatio}>
      <div data-testid="scene-first-last" className="h-full flex flex-col justify-center gap-8">
        <div className="text-center">
          <Eyebrow>{copy.scene.firstLast.title}</Eyebrow>
        </div>
        <Entry label={copy.scene.firstLast.first} item={data.first} locale={locale} />
        <Entry label={copy.scene.firstLast.last} item={data.last} locale={locale} />
      </div>
    </SceneFrame>
  );
}
