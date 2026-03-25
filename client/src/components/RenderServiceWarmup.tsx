'use client';

import { useRenderServiceWarmup } from '@/hooks/useRenderServiceWarmup';

/**
 * 無 UI 的 client component，負責在 App 掛載時啟動 Puppeteer service 預熱
 * 雙層策略：App 開啟時立即 ping + 每 10 分鐘 heartbeat（防止 Render sleep）
 */
export function RenderServiceWarmup() {
  useRenderServiceWarmup();
  return null;
}
