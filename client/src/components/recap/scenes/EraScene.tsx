'use client';

import React from 'react';
import type { EraScene as EraData } from '@/lib/recap/types';
import { eraRange, fill } from '@/lib/recap/format';
import SceneFrame from '../SceneFrame';
import { Eyebrow, GOLD, type SceneProps, pickPosters } from './shared';

/** 最多顯示幾列；十年太多時，最舊的幾個合併成一列「更早」。 */
const MAX_ROWS = 6;

interface EraRow {
  key: string;
  label: string;
  count: number;
}

function buildRows(data: EraData, copy: SceneProps<EraData>['copy']): EraRow[] {
  const { decades } = data;
  if (decades.length <= MAX_ROWS) {
    return decades.map((d) => ({ key: String(d.decade), label: eraRange(d.decade), count: d.count }));
  }
  const keep = decades.slice(decades.length - (MAX_ROWS - 1));
  const folded = decades.slice(0, decades.length - (MAX_ROWS - 1));
  return [
    { key: 'earlier', label: fill(copy.scene.eras.earlier, { year: keep[0].decade }), count: folded.reduce((sum, d) => sum + d.count, 0) },
    ...keep.map((d) => ({ key: String(d.decade), label: eraRange(d.decade), count: d.count })),
  ];
}

/** 年代分佈：電影與影集依發行年份，每個十年各幾部（由舊到新）。 */
export default function EraScene({ data, copy, aspectRatio, backdrop }: SceneProps<EraData>) {
  const rows = buildRows(data, copy);
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <SceneFrame aspectRatio={aspectRatio} posters={pickPosters(data.posters, backdrop)}>
      <div data-testid="scene-eras" className="h-full flex flex-col justify-center gap-7">
        <div className="text-center">
          <Eyebrow>{copy.scene.eras.title}</Eyebrow>
        </div>
        <div className="flex flex-col gap-5">
          {rows.map((row) => {
            const top = row.count === max;
            return (
              <div key={row.key} data-testid="era-row" className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <span className={top ? 'text-[24px] font-black' : 'text-[18px] font-bold'}>{row.label}</span>
                  <span className="text-[14px] text-white/70">{fill(copy.scene.eras.count, { n: row.count })}</span>
                </div>
                <div className="h-[10px] rounded-full bg-white/10 overflow-hidden">
                  <div
                    data-testid="era-bar"
                    className="h-full rounded-full"
                    style={{ width: `${Math.round((row.count / max) * 100)}%`, background: GOLD, opacity: top ? 1 : 0.7 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneFrame>
  );
}
