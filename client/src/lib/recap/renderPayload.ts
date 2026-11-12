import type { RenderPayload, RenderSettings } from '@/lib/share-api';
import type { RecapAspect, RecapData, RecapLocale, SceneKey } from './types';

/** 單一場景的渲染請求內容（不含 settings；settings 由 useProgressiveRenderQueue 合併 selectedTemplate）。 */
export function buildRecapPayload(recap: RecapData, sceneKey: SceneKey): Omit<RenderPayload, 'settings'> {
  return { template: 'recap-scene', item: { recap, sceneKey } };
}

/**
 * Recap 的渲染設定：只含這三個會影響輸出的值——它們同時是快取 key 的雜湊來源，
 * 比例、語系或心得換句改變時，舊的快取圖會自動失效（預覽＝輸出）。
 */
export function recapRenderSettings(opts: {
  aspectRatio: RecapAspect;
  locale: RecapLocale;
  reflectionIndex: number;
}): RenderSettings {
  return { aspectRatio: opts.aspectRatio, locale: opts.locale, recapReflectionIndex: opts.reflectionIndex };
}
