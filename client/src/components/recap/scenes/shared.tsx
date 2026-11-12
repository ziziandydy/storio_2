'use client';

import React from 'react';
import type { translations } from '@/i18n/locales';
import type { RecapAspect, RecapLocale } from '@/lib/recap/types';
import SceneFrame, { type RecapFrame } from '../SceneFrame';
import CountUp from '../CountUp';

export const GOLD = '#c5a059';

/** 場景文案（兩語系鍵相同，用聯集型別讓元件可直接讀取屬性）。元件內不使用 hook，文案由呼叫端傳入。 */
export type RecapCopy =
  | (typeof translations)['en-US']['recap']
  | (typeof translations)['zh-TW']['recap'];

export interface SceneProps<T> {
  data: T;
  copy: RecapCopy;
  locale: RecapLocale;
  aspectRatio: RecapAspect;
  /** 2B 的渲染服務傳 false：數字直接顯示終值 */
  animate: boolean;
  year: number;
  isPartial: boolean;
  /** 沒有自己海報資料的場景用的背景海報（今年收藏的海報）；沒有就是純黑底 */
  backdrop?: string[];
}

/** 場景自己的背景海報（後端依場景挑好的）優先；沒有才退回今年的海報（backdrop）。 */
export function pickPosters(own: string[] | undefined | null, fallback?: string[]): string[] | undefined {
  return own && own.length > 0 ? own : fallback;
}

/** 把含 `{n}` 的文案拆開，數字用計數動畫（例如「{n} 部電影」→ 5 部電影）。 */
export function CountText({ template, value, animate }: { template: string; value: number; animate: boolean }) {
  const [before, after = ''] = template.split('{n}');
  return (
    <>
      {before}
      <CountUp value={value} animate={animate} />
      {after}
    </>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-black" style={{ color: GOLD, fontSize: '22px', lineHeight: 1.3, letterSpacing: '0.12em' }}>
      {children}
    </div>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block rounded-full border px-3 py-1 text-[11px] font-bold tracking-widest"
      style={{ borderColor: 'rgba(197,160,89,0.5)', color: GOLD }}
    >
      {children}
    </span>
  );
}

interface StatLayoutProps {
  aspectRatio: RecapAspect;
  posters?: string[];
  frame?: RecapFrame;
  testId: string;
  eyebrow?: React.ReactNode;
  /** 主要大字（通常含 CountText） */
  headline?: React.ReactNode;
  /** 其下的說明行；falsy 項目會被略過 */
  lines?: (React.ReactNode | false | null | undefined)[];
  badge?: React.ReactNode;
}

/** 數據型場景的共同版面：垂直置中，眉標＋大字＋說明行＋徽章。 */
export function StatLayout({ aspectRatio, posters, frame, testId, eyebrow, headline, lines = [], badge }: StatLayoutProps) {
  return (
    <SceneFrame aspectRatio={aspectRatio} posters={posters} frame={frame}>
      <div data-testid={testId} className="h-full flex flex-col items-center justify-center text-center gap-4">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {headline && <div className="text-[56px] leading-tight font-black" style={{ textWrap: 'balance', whiteSpace: 'pre-line' }}>{headline}</div>}
        {lines.filter(Boolean).map((line, i) => (
          <div key={i} className="text-[18px] font-medium text-white/85">
            {line}
          </div>
        ))}
        {badge}
      </div>
    </SceneFrame>
  );
}
