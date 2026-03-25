import { useCallback, useEffect, useRef, useState } from 'react';
import { renderShareImage, computeSettingsHash } from '@/lib/share-api';
import type { RenderPayload, RenderSettings } from '@/lib/share-api';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘
const SETTINGS_DEBOUNCE_MS = 1500; // 1.5s debounce

// TTL Cache 項目
interface CacheEntry {
  blob: Blob;
  objectUrl: string;
  expiresAt: number;
}

// cache key = `${templateId}:${settingsHash}`
const renderCache = new Map<string, CacheEntry>();

function getCachedRender(key: string): CacheEntry | null {
  const entry = renderCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    URL.revokeObjectURL(entry.objectUrl);
    renderCache.delete(key);
    return null;
  }
  return entry;
}

function setCachedRender(key: string, blob: Blob): CacheEntry {
  // 若已有舊項目先 revoke
  const old = renderCache.get(key);
  if (old) URL.revokeObjectURL(old.objectUrl);

  const objectUrl = URL.createObjectURL(blob);
  const entry: CacheEntry = {
    blob,
    objectUrl,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  renderCache.set(key, entry);
  return entry;
}

export function invalidateCache() {
  for (const [, entry] of renderCache) {
    URL.revokeObjectURL(entry.objectUrl);
  }
  renderCache.clear();
}

export type TemplateId = string;

export interface UseProgressiveRenderQueueOptions {
  /** 所有可用模板 ID 列表 */
  allTemplates: TemplateId[];
  /** 當前選中模板 ID */
  currentTemplate: TemplateId;
  /** 每個模板對應的 RenderPayload（不含 settings） */
  getPayload: (templateId: TemplateId) => Omit<RenderPayload, 'settings'>;
  /** 共用設定（showRating 等），變更時 debounce 後重新 queue */
  settings: RenderSettings;
  /** 是否啟動 queue（通常在服務就緒後才啟動）*/
  enabled: boolean;
}

export interface UseProgressiveRenderQueueResult {
  /** 取得指定模板的 cache 結果（null 表示尚未就緒）*/
  getCacheEntry: (templateId: TemplateId) => CacheEntry | null;
  /** 優先處理指定模板（插隊至 queue 最前）*/
  prioritize: (templateId: TemplateId) => void;
  /** 目前是否有 render 進行中 */
  isRendering: boolean;
  /** 目前 queue 中的模板（等待渲染順序）*/
  queue: TemplateId[];
  /** 手動清除所有 cache 並重新 queue */
  reset: () => void;
  /** Modal 關閉時呼叫：清理所有 cache objectUrl */
  cleanup: () => void;
}

export function useProgressiveRenderQueue({
  allTemplates,
  currentTemplate,
  getPayload,
  settings,
  enabled,
}: UseProgressiveRenderQueueOptions): UseProgressiveRenderQueueResult {
  const [queue, setQueue] = useState<TemplateId[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  // 用 ref 避免 stale closure 問題
  const queueRef = useRef<TemplateId[]>([]);
  const isRenderingRef = useRef(false);
  const settingsRef = useRef(settings);
  const enabledRef = useRef(enabled);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 用 counter 強制 re-render（cache 更新後讓元件重繪）
  const [, forceUpdate] = useState(0);

  const settingsHash = computeSettingsHash(settings);

  // 同步 ref
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // 建立初始 queue：當前模板排第一，其餘依序排列
  const buildInitialQueue = useCallback(
    (current: TemplateId, templates: TemplateId[]): TemplateId[] => {
      const hash = computeSettingsHash(settingsRef.current);
      // 過濾已有 cache 的模板
      const remaining = templates.filter((t) => !getCachedRender(`${t}:${hash}`));
      // 當前模板排第一
      const sorted = [
        current,
        ...remaining.filter((t) => t !== current),
      ];
      return sorted.filter((t) => !getCachedRender(`${t}:${hash}`));
    },
    []
  );

  // Queue processor：依序處理，一次只跑一個
  const processQueue = useCallback(async () => {
    if (isRenderingRef.current) return;
    if (queueRef.current.length === 0) return;

    const templateId = queueRef.current[0];
    if (!templateId) return;

    const hash = computeSettingsHash(settingsRef.current);
    const cacheKey = `${templateId}:${hash}`;

    // 已有 cache 則跳過
    if (getCachedRender(cacheKey)) {
      const next = queueRef.current.slice(1);
      queueRef.current = next;
      setQueue([...next]);
      // 繼續下一項
      setTimeout(() => processQueue(), 0);
      return;
    }

    isRenderingRef.current = true;
    setIsRendering(true);

    try {
      const basePayload = getPayload(templateId);
      // 合併 selectedTemplate（來自 queue 的 templateId）與共用設定（showTitle 等）
      const payload: RenderPayload = {
        ...basePayload,
        settings: { ...settingsRef.current, selectedTemplate: templateId },
      };
      const blob = await renderShareImage(payload);
      setCachedRender(cacheKey, blob);
      forceUpdate((n) => n + 1);
    } catch (err) {
      console.error(`[RenderQueue] 渲染失敗 ${templateId}:`, err);
    } finally {
      // 從 queue 移除已處理的
      const next = queueRef.current.slice(1);
      queueRef.current = next;
      setQueue([...next]);
      isRenderingRef.current = false;
      setIsRendering(false);

      // 繼續處理下一項
      if (next.length > 0) {
        setTimeout(() => processQueue(), 0);
      }
    }
  }, [getPayload]);

  // 啟動 queue
  useEffect(() => {
    if (!enabled) return;
    const initial = buildInitialQueue(currentTemplate, allTemplates);
    queueRef.current = initial;
    setQueue([...initial]);
    processQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // settings 變更：1.5s debounce 後重新 queue
  useEffect(() => {
    if (!enabled) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      invalidateCache();
      const initial = buildInitialQueue(currentTemplate, allTemplates);
      queueRef.current = initial;
      setQueue([...initial]);
      if (!isRenderingRef.current) {
        processQueue();
      }
    }, SETTINGS_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsHash, enabled]);

  // prioritize：將指定模板移至 queue 最前
  const prioritize = useCallback((targetTemplate: TemplateId) => {
    const hash = computeSettingsHash(settingsRef.current);
    const cacheKey = `${targetTemplate}:${hash}`;

    // 已在 cache 則不需入 queue
    if (getCachedRender(cacheKey)) return;

    const current = queueRef.current;
    if (!current.includes(targetTemplate)) {
      // 尚未在 queue，加入最前
      const next = [targetTemplate, ...current];
      queueRef.current = next;
      setQueue([...next]);
    } else {
      // 移至最前
      const next = [targetTemplate, ...current.filter((t) => t !== targetTemplate)];
      queueRef.current = next;
      setQueue([...next]);
    }

    // 若目前沒有在跑，觸發 processQueue
    if (!isRenderingRef.current) {
      processQueue();
    }
  }, [processQueue]);

  const getCacheEntry = useCallback((templateId: TemplateId): CacheEntry | null => {
    const hash = computeSettingsHash(settingsRef.current);
    return getCachedRender(`${templateId}:${hash}`);
  }, []);

  const reset = useCallback(() => {
    invalidateCache();
    const initial = buildInitialQueue(currentTemplate, allTemplates);
    queueRef.current = initial;
    setQueue([...initial]);
    if (!isRenderingRef.current) processQueue();
  }, [buildInitialQueue, currentTemplate, allTemplates, processQueue]);

  const cleanup = useCallback(() => {
    invalidateCache();
    queueRef.current = [];
    setQueue([]);
    isRenderingRef.current = false;
    setIsRendering(false);
  }, []);

  return {
    getCacheEntry,
    prioritize,
    isRendering,
    queue,
    reset,
    cleanup,
  };
}
