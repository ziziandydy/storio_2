import type { RecapLocale } from './types';

/** 分鐘 → 小時（四捨五入到整數）；不到 60 分鐘維持分鐘。 */
export function formatDuration(minutes: number, _locale: RecapLocale): { value: number; unit: 'h' | 'm' } {
  if (minutes >= 60) return { value: Math.round(minutes / 60), unit: 'h' };
  return { value: Math.round(minutes), unit: 'm' };
}

/** 年代標籤：zh-TW「90 年代」、en-US「1990s」。 */
export function decadeLabel(decade: number, locale: RecapLocale): string {
  if (locale === 'zh-TW') return `${String(decade % 100).padStart(2, '0')} 年代`;
  return `${decade}s`;
}
