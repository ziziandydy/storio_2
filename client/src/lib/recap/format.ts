import type { RecapLocale } from './types';

/** 分鐘 → 小時（四捨五入到整數）；不到 60 分鐘維持分鐘。 */
export function formatDuration(minutes: number, _locale: RecapLocale): { value: number; unit: 'h' | 'm' } {
  if (minutes >= 60) return { value: Math.round(minutes / 60), unit: 'h' };
  return { value: Math.round(minutes), unit: 'm' };
}

/** 套用文案佔位符：`{n}`、`{year}` 等；沒有對應變數的佔位符保持原樣。 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

export interface DurationCopy {
  hours: string;
  hoursOne: string;
  minutes: string;
  minutesOne: string;
}

/** 時間文字（含單複數），例如 3907 → 「65 小時」／「65 hours」。 */
export function durationText(copy: DurationCopy, minutes: number): string {
  const { value, unit } = formatDuration(minutes, 'zh-TW');
  const template =
    unit === 'h' ? (value === 1 ? copy.hoursOne : copy.hours) : value === 1 ? copy.minutesOne : copy.minutes;
  return fill(template, { n: value });
}

/** 年代標籤：zh-TW「1990 年代」、en-US「1990s」（完整年份，避免「00 年代」「10 年代」含糊）。 */
export function decadeLabel(decade: number, locale: RecapLocale): string {
  if (locale === 'zh-TW') return `${decade} 年代`;
  return `${decade}s`;
}
