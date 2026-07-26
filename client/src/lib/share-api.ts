import type { RenderPayload, RenderSettings } from '@/app/share/render/page';

export type { RenderPayload, RenderSettings };

// 從環境變數讀取 Puppeteer service URL
const PUPPETEER_SERVICE_URL =
  process.env.NEXT_PUBLIC_PUPPETEER_SERVICE_URL || 'http://localhost:4000';

/**
 * 呼叫 Puppeteer service 渲染截圖，返回 PNG Blob
 */
export async function renderShareImage(payload: RenderPayload): Promise<Blob> {
  const res = await fetch(`${PUPPETEER_SERVICE_URL}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: '未知錯誤' }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.blob();
}

/**
 * 檢查 Render service 是否健康（3s timeout）
 * 返回 true 表示服務就緒，false 表示服務尚未啟動或逾時
 */
export async function getRenderServiceHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${PUPPETEER_SERVICE_URL}/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 將 Blob 轉為純 base64 字串（不含 data: URL 前綴），供 Capacitor Filesystem.writeFile 使用。
 * 用 FileReader.readAsDataURL 而非逐 byte 迴圈 + String.fromCharCode 累加字串——
 * 後者在圖片內容較大（例如提高 deviceScaleFactor 後的真實海報截圖，可能達 1-3MB）
 * 時會在 iOS WKWebView 的 JS 執行緒上造成明顯卡頓。
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('讀取圖片資料失敗'));
    reader.readAsDataURL(blob);
  });
}

/**
 * 計算 settings 的 hash，用於 cache key 生成
 * settings 變更時 hash 變化，自動 miss cache
 */
export function computeSettingsHash(settings: RenderSettings): string {
  const str = JSON.stringify(settings, Object.keys(settings).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 轉為 32bit integer
  }
  return Math.abs(hash).toString(36);
}
