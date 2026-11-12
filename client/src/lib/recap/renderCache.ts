import { renderShareImage, type RenderPayload } from '@/lib/share-api';
import type { RecapAspect, RecapData, RecapLocale, SceneKey } from './types';

/**
 * Recap 分享圖的渲染與快取。
 * - 只在用戶真的要儲存／分享時才渲染（縮圖用前端場景元件，不走這裡），而且只渲染被勾選的場景。
 * - 快取以「資料內容＋場景＋比例＋語系＋心得索引」為 key，存在這次 App 使用期間的記憶體裡；
 *   關掉面板、再開、切回同一比例都直接用，不必重打伺服器。資料真的變了（新增收藏）key 就不同，自動失效。
 * - 總量上限 40MB（最久沒用的先淘汰）、逾時 30 分鐘。
 * - 同一張同時被要求多次只送一次請求。
 */

const MAX_BYTES = 40 * 1024 * 1024;
const TTL_MS = 30 * 60 * 1000;
const DEFAULT_CONCURRENCY = 2;

export interface RecapRenderSettings {
  aspectRatio: RecapAspect;
  locale: RecapLocale;
  reflectionIndex: number;
}

type Renderer = (payload: RenderPayload) => Promise<Blob>;

interface Entry {
  blob: Blob;
  expiresAt: number;
  lastUsed: number;
}

let tick = 0; // 遞增計數當「最近使用」順序（毫秒時間在同一毫秒內會平手）
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<Blob>>();
const fingerprints = new WeakMap<RecapData, string>();

/** 32 位元 FNV-1a，兩個不同種子拼成 64 位元的短指紋（快取 key 用，不是安全用途）。 */
function hashString(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x85ebca6b);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

/** Recap 資料的內容指紋：內容相同（即使是重新抓取的新物件）指紋就相同。每個物件只算一次。 */
export function recapFingerprint(recap: RecapData): string {
  let value = fingerprints.get(recap);
  if (!value) {
    value = hashString(JSON.stringify(recap));
    fingerprints.set(recap, value);
  }
  return value;
}

export function renderKey(recap: RecapData, sceneKey: SceneKey, settings: RecapRenderSettings): string {
  return [recapFingerprint(recap), sceneKey, settings.aspectRatio, settings.locale, settings.reflectionIndex].join('|');
}

export function getCachedScene(key: string): Blob | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  entry.lastUsed = ++tick;
  return entry.blob;
}

function store(key: string, blob: Blob): void {
  cache.set(key, { blob, expiresAt: Date.now() + TTL_MS, lastUsed: ++tick });
  let total = 0;
  cache.forEach((e) => {
    total += e.blob.size;
  });
  if (total <= MAX_BYTES) return;
  // 淘汰最久沒用的，直到總量回到上限內（剛放進去的這張不淘汰）
  const oldestFirst = [...cache.entries()].filter(([k]) => k !== key).sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  for (const [k, e] of oldestFirst) {
    if (total <= MAX_BYTES) break;
    cache.delete(k);
    total -= e.blob.size;
  }
}

export function clearRenderCache(): void {
  cache.clear();
  inflight.clear();
}

interface RenderOne {
  recap: RecapData;
  sceneKey: SceneKey;
  settings: RecapRenderSettings;
  /** 測試用：換掉真的送去 Puppeteer 服務的函式 */
  render?: Renderer;
}

export function renderRecapScene({ recap, sceneKey, settings, render = renderShareImage }: RenderOne): Promise<Blob> {
  const key = renderKey(recap, sceneKey, settings);
  const cached = getCachedScene(key);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(key);
  if (running) return running;

  const payload: RenderPayload = {
    template: 'recap-scene',
    item: { recap, sceneKey },
    settings: {
      aspectRatio: settings.aspectRatio,
      locale: settings.locale,
      recapReflectionIndex: settings.reflectionIndex,
      selectedTemplate: sceneKey,
    },
  };
  const promise = render(payload)
    .then((blob) => {
      store(key, blob);
      return blob;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, promise);
  return promise;
}

interface RenderMany {
  recap: RecapData;
  sceneKeys: SceneKey[];
  settings: RecapRenderSettings;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
  render?: Renderer;
}

/** 批次渲染（儲存全部）：最多同時 concurrency 張、依輸入順序回傳；任一張失敗整批失敗。 */
export async function renderRecapScenes({
  recap, sceneKeys, settings, concurrency = DEFAULT_CONCURRENCY, onProgress, render,
}: RenderMany): Promise<{ sceneKey: SceneKey; blob: Blob }[]> {
  const results: { sceneKey: SceneKey; blob: Blob }[] = new Array(sceneKeys.length);
  let next = 0;
  let done = 0;
  let failure: unknown = null;

  const worker = async () => {
    while (failure === null) {
      const index = next++;
      if (index >= sceneKeys.length) return;
      const sceneKey = sceneKeys[index];
      try {
        const blob = await renderRecapScene({ recap, sceneKey, settings, render });
        results[index] = { sceneKey, blob };
        done++;
        onProgress?.(done, sceneKeys.length);
      } catch (error) {
        failure = error ?? new Error('render failed');
        return;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, sceneKeys.length) }, worker));
  if (failure !== null) throw failure;
  return results;
}
