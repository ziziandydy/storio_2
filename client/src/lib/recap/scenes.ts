import type { RecapData, SceneKey } from './types';

/** 場景固定順序（開場 → … → 結尾）。 */
export const SCENE_ORDER: SceneKey[] = [
  'opening', 'total', 'movies', 'series', 'books', 'genres', 'eras',
  'monthly', 'peak_month', 'months_active', 'top_rated', 'title', 'first_last', 'reflection', 'closing',
];

/**
 * 依固定順序回傳「出現的」場景：後端回 null 的場景一律跳過。
 * 預覽（forShare=false）不含結尾場景（預覽最後一頁是「繼續收藏」，不輸出為圖）；
 * 分享（forShare=true）含結尾場景。
 */
export function buildScenes(recap: RecapData, opts: { forShare: boolean }): SceneKey[] {
  return SCENE_ORDER.filter((key) => {
    if (key === 'closing') return opts.forShare;
    return recap[key] != null;
  });
}
