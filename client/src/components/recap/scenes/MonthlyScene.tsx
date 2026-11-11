'use client';

import React from 'react';
import type { MonthlyScene as MonthlyData } from '@/lib/recap/types';
import SceneFrame from '../SceneFrame';
import { Eyebrow, GOLD, type SceneProps } from './shared';

const MIN_BAR_PERCENT = 4; // 0 部的月份仍畫一小段，避免長條消失

export default function MonthlyScene({ data, copy, aspectRatio }: SceneProps<MonthlyData>) {
  const max = Math.max(...data.counts, 0);
  const peakIndex = max > 0 ? data.counts.indexOf(max) : -1;

  return (
    <SceneFrame aspectRatio={aspectRatio}>
      <div data-testid="scene-monthly" className="h-full flex flex-col justify-center gap-8">
        <div className="text-center">
          <Eyebrow>{copy.scene.monthly.title}</Eyebrow>
        </div>
        <div className="flex items-end justify-between gap-[6px] h-[220px]">
          {data.counts.map((count, i) => {
            const percent = max > 0 ? Math.max(MIN_BAR_PERCENT, Math.round((count / max) * 100)) : MIN_BAR_PERCENT;
            const isPeak = i === peakIndex;
            return (
              <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                <div
                  data-testid="month-bar"
                  data-month={i + 1}
                  {...(isPeak ? { 'data-peak': '' } : {})}
                  className="w-full rounded-t-md"
                  style={{ height: `${percent}%`, background: isPeak ? GOLD : 'rgba(255,255,255,0.28)' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between gap-[6px]">
          {copy.months.map((label, i) => (
            <span key={i} className="flex-1 text-center text-[9px] text-white/60 whitespace-nowrap">
              {label}
            </span>
          ))}
        </div>
      </div>
    </SceneFrame>
  );
}
