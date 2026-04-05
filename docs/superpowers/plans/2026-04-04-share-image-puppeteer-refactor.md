# Share Image Puppeteer Refactor 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以 Puppeteer 截圖微服務（部署於 Railway）取代 `html-to-image`，解決 Safari/WKWebView 的結構性截圖失真問題，並實現 Progressive Render Queue。

**Architecture:** 新增獨立 Node.js `puppeteer-service`（Railway），接受 POST /render 請求；前端新增靜態 `/share/render` 頁面供 Puppeteer 導航截圖；ShareModal 與 MonthlyRecapModal 改用 Progressive Render Queue + TTL Cache，模板切換時圖片逐步就緒。

**Tech Stack:** Node.js 20 + Express + Puppeteer（puppeteer-service）；Next.js 14 static export（前端）；Railway Hobby（部署，無冷啟動）；TypeScript（share-api、render-cache、useRenderQueue）

---

## 現狀確認

| 檔案 | 狀態 | 說明 |
|------|------|------|
| `puppeteer-service/` | ❌ 不存在 | 需從頭建立 |
| `client/src/app/share/render/page.tsx` | ❌ 不存在 | 需建立 |
| `client/src/lib/share-api.ts` | ❌ 不存在 | 需建立 |
| `client/src/components/ShareModal.tsx` | 🔴 舊邏輯 | 541 行，含 html-to-image、hidden container、cachedDataUrl |
| `client/src/components/MonthlyRecapModal.tsx` | 🔴 舊邏輯 | 473 行，同樣使用 html-to-image |
| `client/src/components/share/MemoryCardTemplate.tsx` | 🟡 需清理 | LOGO_PATH/DESK_BG_PATH 含 `new Date().getTime()` |
| `client/src/lib/image-utils.ts` | 🟡 需清理 | `_t` timestamp + `salt` cache-busting |
| `client/package.json` | 🟡 需移除 | `html-to-image` 依賴 |

---

## 檔案結構對應

```
puppeteer-service/
├── package.json           # Node 20, ESM, express + puppeteer + cors
├── railway.toml           # Railway 部署配置
└── src/
    └── index.js           # Express server: GET /health, POST /render

client/src/
├── app/share/render/
│   └── page.tsx           # 靜態截圖頁面，讀取 window.__RENDER_DATA__
├── lib/
│   ├── share-api.ts       # Puppeteer service API client
│   └── render-cache.ts    # TTL Cache 工具函式（Map + URL.createObjectURL）
├── hooks/
│   └── useRenderQueue.ts  # Progressive Render Queue hook
└── components/
    ├── ShareModal.tsx      # 重構：移除 html-to-image，接入 useRenderQueue
    └── MonthlyRecapModal.tsx # 重構：同上
```

---

## Task 1：Puppeteer Service — package.json 與 railway.toml

**Files:**
- Create: `puppeteer-service/package.json`
- Create: `puppeteer-service/railway.toml`

- [ ] **Step 1.1：建立目錄與 package.json**

```bash
mkdir -p puppeteer-service/src
```

建立 `puppeteer-service/package.json`：

```json
{
  "name": "storio-puppeteer-service",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "puppeteer": "^22.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 1.2：建立 railway.toml**

建立 `puppeteer-service/railway.toml`：

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

- [ ] **Step 1.3：安裝依賴**

```bash
cd puppeteer-service && npm install
```

預期：`node_modules/` 建立，`package-lock.json` 生成。

- [ ] **Step 1.4：Commit**

```bash
git add puppeteer-service/package.json puppeteer-service/package-lock.json puppeteer-service/railway.toml
git commit -m "feat(puppeteer-service): init package with express + puppeteer + railway config"
```

---

## Task 2：Puppeteer Service — Express Server 實作

**Files:**
- Create: `puppeteer-service/src/index.js`

- [ ] **Step 2.1：建立 src/index.js**

```javascript
import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Default allowed origins
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'capacitor://localhost',
];
const allowedOrigins = [...new Set([...defaultOrigins, ...ALLOWED_ORIGINS])];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  }
}));
app.use(express.json({ limit: '2mb' }));

// Browser singleton
let browser = null;

async function getBrowser() {
  if (browser) return browser;
  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  });
  browser.on('disconnected', () => {
    browser = null;
  });
  return browser;
}

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// POST /render
app.post('/render', async (req, res) => {
  const { template, item, settings } = req.body;

  if (!template || !item) {
    return res.status(400).json({ error: 'Missing required fields: template, item' });
  }

  let page = null;
  try {
    const b = await getBrowser();
    page = await b.newPage();

    await page.setViewport({ width: 400, height: 711 });
    await page.goto(`${FRONTEND_URL}/share/render`, { waitUntil: 'networkidle0', timeout: 15000 });

    // Inject render data after navigation
    await page.evaluate((data) => {
      window.__RENDER_DATA__ = data;
    }, { template, item, settings: settings || {} });

    // Wait for ready signal (timeout 30s)
    await page.waitForFunction(
      () => window.__RENDER_READY__ === true,
      { timeout: 30000 }
    );

    const screenshot = await page.screenshot({ type: 'png' });

    res.set('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    const isTimeout = error.message?.includes('timeout') || error.name === 'TimeoutError';
    const statusCode = isTimeout ? 504 : 500;
    console.error('[render] Error:', error.message);
    res.status(statusCode).json({ error: isTimeout ? 'Render timeout' : 'Render failed', detail: error.message });
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
  }
});

app.listen(PORT, () => {
  console.log(`Puppeteer service listening on port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
```

- [ ] **Step 2.2：本地啟動並測試 /health**

```bash
cd puppeteer-service && npm start &
sleep 3
curl http://localhost:4000/health
```

預期輸出：`{"status":"ok","uptime":...}`

> **注意：** `/render` 的 end-to-end 截圖驗證在 Task 3 Step 3.4 執行（需要 `/share/render` 頁面已建立）。

- [ ] **Step 2.3：Commit**

```bash
git add puppeteer-service/src/index.js
git commit -m "feat(puppeteer-service): implement Express server with /health and /render endpoints"
```

---

## Task 3：/share/render 靜態頁面

**Files:**
- Create: `client/src/app/share/render/page.tsx`

**重要：** 此頁面不得有 NavigationFAB、header 等 application chrome。

- [ ] **Step 3.1：建立 page.tsx**

建立 `client/src/app/share/render/page.tsx`：

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import MemoryCardTemplate from '@/components/share/MemoryCardTemplate';
import MonthlyRecapTemplate from '@/components/share/MonthlyRecapTemplate';

interface RenderPayload {
  template: string;
  item: Record<string, any>;
  settings: {
    aspectRatio?: '9:16' | '4:5' | '1:1';
    showTitle?: boolean;
    showRating?: boolean;
    showReflection?: boolean;
  };
}

declare global {
  interface Window {
    __RENDER_DATA__: RenderPayload;
    __RENDER_READY__: boolean;
  }
}

const MONTHLY_TEMPLATES = ['calendar', 'collage', 'waterfall', 'shelf'];

export default function ShareRenderPage() {
  const [renderData, setRenderData] = useState<RenderPayload | null>(null);

  useEffect(() => {
    const poll = setInterval(() => {
      const data = window.__RENDER_DATA__;
      if (!data) return;
      clearInterval(poll);
      setRenderData(data);
    }, 100);

    // Timeout safety: stop polling after 10s
    const timeout = setTimeout(() => clearInterval(poll), 10000);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!renderData) return;
    document.fonts.ready.then(() => {
      window.__RENDER_READY__ = true;
    });
  }, [renderData]);

  if (!renderData) {
    return (
      <div style={{ width: '400px', height: '711px', background: '#0d0d0d' }} />
    );
  }

  const { template, item, settings } = renderData;
  const isMonthly = MONTHLY_TEMPLATES.includes(template);

  return (
    <div style={{ margin: 0, padding: 0, background: '#0d0d0d', display: 'inline-block' }}>
      {isMonthly ? (
        <MonthlyRecapTemplate
          selectedTemplate={template as any}
          aspectRatio={settings.aspectRatio || '9:16'}
          statsData={item as any}
          monthName={item.monthName || ''}
          monthValue={item.monthValue || ''}
        />
      ) : (
        <MemoryCardTemplate
          {...item}
          selectedTemplate={template as any}
          aspectRatio={settings.aspectRatio || '9:16'}
          showTitle={settings.showTitle ?? true}
          showRating={settings.showRating ?? true}
          showReflection={settings.showReflection ?? true}
        />
      )}
      {/* NOTE: item payload for MonthlyRecap 必須包含 monthValue（YYYY-MM），
          calendar 模板內部 monthValue.split('-') 取年月，缺少會 runtime crash */}
    </div>
  );
}
```

- [ ] **Step 3.2：確認 MonthlyRecapTemplate props**

```bash
grep -n "interface.*Props\|export default function" client/src/components/share/MonthlyRecapTemplate.tsx | head -10
```

如 props 不符，調整 page.tsx 中的 MonthlyRecapTemplate 呼叫方式。

- [ ] **Step 3.3：本地 build 驗證**

```bash
cd client && npm run build 2>&1 | grep -E "error|share/render"
```

預期：無 TypeScript error，`/share/render` 出現在 build 輸出中。

- [ ] **Step 3.4：本地驗證截圖 render 頁面**

```bash
# 開啟 Next.js dev server
cd client && npm run dev &
sleep 5

# 用 Puppeteer service 測試 render
curl -s -X POST http://localhost:4000/render \
  -H "Content-Type: application/json" \
  -d '{"template":"default","item":{"title":"Test Movie","year":"2024","posterPath":"/image/defaultMoviePoster.svg","rating":4,"type":"movie"},"settings":{}}' \
  --output /tmp/test-render.png

# 確認輸出是有效的 PNG
file /tmp/test-render.png
```

預期：`/tmp/test-render.png: PNG image data`

- [ ] **Step 3.5：Commit**

```bash
git add client/src/app/share/render/page.tsx
git commit -m "feat(frontend): add /share/render static page for Puppeteer screenshot"
```

---

## Task 4：share-api.ts — Puppeteer Service API Client

**Files:**
- Create: `client/src/lib/share-api.ts`
- Modify: `client/.env.local.example`（若存在）

- [ ] **Step 4.1：建立 share-api.ts**

建立 `client/src/lib/share-api.ts`：

```typescript
export interface RenderSettings {
  aspectRatio?: '9:16' | '4:5' | '1:1';
  showTitle?: boolean;
  showRating?: boolean;
  showReflection?: boolean;
}

export interface RenderPayload {
  template: string;
  item: Record<string, any>;
  settings: RenderSettings;
}

function getPuppeteerServiceUrl(): string {
  return process.env.NEXT_PUBLIC_PUPPETEER_SERVICE_URL || 'http://localhost:4000';
}

export async function getRenderServiceHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${getPuppeteerServiceUrl()}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function renderShareImage(payload: RenderPayload): Promise<Blob> {
  const res = await fetch(`${getPuppeteerServiceUrl()}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(35000),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Render failed: HTTP ${res.status}`);
  }

  return res.blob();
}

export function computeSettingsHash(settings: RenderSettings): string {
  return JSON.stringify(settings);
}
```

- [ ] **Step 4.2：在 .env.local 加入變數**

```bash
echo "NEXT_PUBLIC_PUPPETEER_SERVICE_URL=http://localhost:4000" >> client/.env.local
```

- [ ] **Step 4.3：TypeScript 編譯確認**

```bash
cd client && npx tsc --noEmit 2>&1 | grep "share-api"
```

預期：無 error。

- [ ] **Step 4.4：Commit**

```bash
git add client/src/lib/share-api.ts client/.env.local
git commit -m "feat(frontend): add share-api.ts for Puppeteer service client"
```

---

## Task 5：render-cache.ts — TTL Cache 工具

**Files:**
- Create: `client/src/lib/render-cache.ts`

- [ ] **Step 5.1：建立 render-cache.ts**

建立 `client/src/lib/render-cache.ts`：

```typescript
const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  blob: Blob;
  objectUrl: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCachedRender(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    URL.revokeObjectURL(entry.objectUrl);
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCachedRender(key: string, blob: Blob): string {
  const existing = cache.get(key);
  if (existing) URL.revokeObjectURL(existing.objectUrl);
  const objectUrl = URL.createObjectURL(blob);
  cache.set(key, { blob, objectUrl, expiresAt: Date.now() + TTL_MS });
  return objectUrl;
}

export function invalidateCache(): void {
  cache.forEach(entry => URL.revokeObjectURL(entry.objectUrl));
  cache.clear();
}

export function clearCacheKey(key: string): void {
  const entry = cache.get(key);
  if (entry) {
    URL.revokeObjectURL(entry.objectUrl);
    cache.delete(key);
  }
}
```

- [ ] **Step 5.2：Commit**

```bash
git add client/src/lib/render-cache.ts
git commit -m "feat(frontend): add render-cache with TTL and objectUrl lifecycle management"
```

---

## Task 6：useRenderQueue hook — Progressive Render Queue

**Files:**
- Create: `client/src/hooks/useRenderQueue.ts`

- [ ] **Step 6.1：建立 useRenderQueue.ts**

建立 `client/src/hooks/useRenderQueue.ts`：

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { renderShareImage, getRenderServiceHealth, computeSettingsHash, RenderPayload, RenderSettings } from '@/lib/share-api';
import { getCachedRender, setCachedRender, invalidateCache } from '@/lib/render-cache';

type ServiceStatus = 'idle' | 'checking' | 'ready' | 'error';

interface UseRenderQueueOptions {
  templates: string[];
  item: Record<string, any> | null;
  settings: RenderSettings;
  enabled: boolean; // false when modal is closed
}

interface UseRenderQueueResult {
  serviceStatus: ServiceStatus;
  getObjectUrl: (template: string) => string | null;
  isRendering: (template: string) => boolean;
  prioritize: (template: string) => void;
  retryServiceCheck: () => void;
}

export function useRenderQueue({
  templates,
  item,
  settings,
  enabled,
}: UseRenderQueueOptions): UseRenderQueueResult {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>('idle');
  const [renderedUrls, setRenderedUrls] = useState<Record<string, string>>({});
  const [renderingSet, setRenderingSet] = useState<Set<string>>(new Set());

  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const settingsRef = useRef(settings);
  const settingsHashRef = useRef(settingsHash); // ref 版本，避免 processNext stale closure
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSettingsRun = useRef(true); // 避免 mount 時 settings effect 誤觸發

  const settingsHash = computeSettingsHash(settings);

  // Cache key per template — 透過 ref 讀取最新 hash，避免 stale closure
  const cacheKey = (template: string) =>
    `${template}:${settingsHashRef.current}`;

  // Process next item in queue
  // useCallback 依賴不含 settingsHash，改由 settingsHashRef.current 讀取最新值，避免 stale closure
  const processNext = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0 || !item) return;

    const template = queueRef.current.shift()!;
    const key = cacheKey(template); // cacheKey 內部讀取 settingsHashRef.current

    // Already cached (fresh) — skip
    if (getCachedRender(key)) {
      if (queueRef.current.length > 0) processNext();
      return;
    }

    isProcessingRef.current = true;
    setRenderingSet(prev => new Set([...prev, template]));

    try {
      const payload: RenderPayload = { template, item, settings: settingsRef.current };
      const blob = await renderShareImage(payload);
      const objectUrl = setCachedRender(key, blob);
      setRenderedUrls(prev => ({ ...prev, [template]: objectUrl }));
    } catch (err) {
      console.error(`[RenderQueue] Failed to render ${template}:`, err);
    } finally {
      isProcessingRef.current = false;
      setRenderingSet(prev => {
        const next = new Set(prev);
        next.delete(template);
        return next;
      });
      if (queueRef.current.length > 0) processNext();
    }
  }, [item, settingsHash]);

  // Check service health
  const checkService = useCallback(async () => {
    setServiceStatus('checking');
    const ok = await getRenderServiceHealth();
    setServiceStatus(ok ? 'ready' : 'error');
    return ok;
  }, []);

  // Initialize queue with current template first
  const initQueue = useCallback((currentTemplate: string) => {
    queueRef.current = [
      currentTemplate,
      ...templates.filter(t => t !== currentTemplate),
    ];
    processNext();
  }, [templates, processNext]);

  // Prioritize a template (move to front)
  const prioritize = useCallback((template: string) => {
    const key = cacheKey(template);
    if (getCachedRender(key)) return; // Already cached
    queueRef.current = [template, ...queueRef.current.filter(t => t !== template)];
    if (!isProcessingRef.current) processNext();
  }, [settingsHash, processNext]);

  // On mount / enabled: check service, then start queue
  useEffect(() => {
    if (!enabled || !item) return;
    let cancelled = false;

    (async () => {
      const ok = await checkService();
      if (cancelled || !ok) return;
      initQueue(templates[0]);
    })();

    return () => { cancelled = true; };
  }, [enabled, item]);

  // Settings change: debounce cache invalidation + re-queue
  // isFirstSettingsRun 跳過 mount 時的初始觸發，避免 modal 開啟後 1.5s 無故清空 cache
  useEffect(() => {
    settingsRef.current = settings;
    settingsHashRef.current = settingsHash; // 同步更新 ref，供 processNext 讀取

    if (isFirstSettingsRun.current) {
      isFirstSettingsRun.current = false;
      return;
    }
    if (!enabled || !item) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      invalidateCache();
      setRenderedUrls({});
      queueRef.current = [...templates];
      isProcessingRef.current = false;
      processNext();
    }, 1500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [settingsHash]);

  // Cleanup on close
  useEffect(() => {
    if (!enabled) {
      queueRef.current = [];
      isProcessingRef.current = false;
      setRenderedUrls({});
      setRenderingSet(new Set());
      setServiceStatus('idle');
    }
  }, [enabled]);

  const getObjectUrl = useCallback((template: string): string | null => {
    const key = cacheKey(template);
    const cached = getCachedRender(key);
    if (cached) return cached.objectUrl;
    return renderedUrls[template] ?? null;
  }, [renderedUrls, settingsHash]);

  const isRendering = useCallback((template: string): boolean => {
    return renderingSet.has(template);
  }, [renderingSet]);

  return {
    serviceStatus,
    getObjectUrl,
    isRendering,
    prioritize,
    retryServiceCheck: checkService,
  };
}
```

- [ ] **Step 6.2：TypeScript 確認**

```bash
cd client && npx tsc --noEmit 2>&1 | grep "useRenderQueue"
```

預期：無 error。

- [ ] **Step 6.3：Commit**

```bash
git add client/src/hooks/useRenderQueue.ts
git commit -m "feat(frontend): add useRenderQueue hook with progressive rendering and TTL cache"
```

---

## Task 7：MemoryCardTemplate 與 image-utils 清理

**Files:**
- Modify: `client/src/components/share/MemoryCardTemplate.tsx`（行 75-76）
- Modify: `client/src/lib/image-utils.ts`（行 46-48）

- [ ] **Step 7.1：移除 MemoryCardTemplate 的 timestamp**

在 `MemoryCardTemplate.tsx` 找到：

```javascript
const LOGO_PATH = `/image/logo/logo.png?t=${new Date().getTime()}`;
const DESK_BG_PATH = `/image/share/desk_bg.jpg?t=${new Date().getTime()}`;
```

改為：

```javascript
const LOGO_PATH = `/image/logo/logo.png`;
const DESK_BG_PATH = `/image/share/desk_bg.jpg`;
```

- [ ] **Step 7.2：移除 image-utils.ts 的 cache-busting**

在 `image-utils.ts` 移除：

```typescript
// 刪除這兩行
const salt = Math.random().toString(36).substring(2, 7);
const timestamp = new Date().getTime();
processedUrl = `${processedUrl}&_t=${timestamp}&salt=${salt}`;
```

並更新 JSDoc 的說明（移除 "cache busting" 相關描述）。

- [ ] **Step 7.3：確認 ShareModal 的 proxiedItem useMemo 仍正常**

```bash
grep -n "proxiedItem\|useMemo\|_t\|salt" client/src/components/ShareModal.tsx | head -10
```

確認 `proxiedItem` 的 useMemo dependencies 中不再有 `salt`（它原本就沒有，只是 `item`，所以應該沒問題）。

- [ ] **Step 7.4：Commit**

```bash
git add client/src/components/share/MemoryCardTemplate.tsx client/src/lib/image-utils.ts
git commit -m "cleanup: remove timestamp cache-busting from MemoryCardTemplate and image-utils"
```

---

## Task 8：ShareModal 重構

**Files:**
- Modify: `client/src/components/ShareModal.tsx`（541 行，大幅重構）

**策略：** 保留所有 UI/UX 結構（drawer、template selector、toggles、action buttons），只替換截圖邏輯。

- [ ] **Step 8.1：移除舊 imports，加入新 imports**

移除：
```typescript
import { toPng } from 'html-to-image';
```

加入（完整清單）：
```typescript
import { useRenderQueue } from '@/hooks/useRenderQueue';
import { getCachedRender } from '@/lib/render-cache';
import { computeSettingsHash } from '@/lib/share-api';
```

保留：`download`、motion、Capacitor、Share、Filesystem 等所有其他 imports。

- [ ] **Step 8.2：移除舊 state，加入新 state**

移除：
```typescript
const [isGenerating, setIsGenerating] = useState(false);
const [cachedDataUrl, setCachedDataUrl] = useState<string | null>(null);
const templateRef = useRef<HTMLDivElement>(null);
```

加入：
```typescript
const [isSharing, setIsSharing] = useState(false);
```

- [ ] **Step 8.3：移除舊邏輯函式**

完整移除以下函式：
- `waitForAllImages`
- `handleCapture`
- 舊的 `useEffect`（cachedDataUrl 預生成）

- [ ] **Step 8.4：加入 useRenderQueue**

在 component 內（state 宣告區之後）加入：

```typescript
const renderTemplates = TEMPLATES.filter(t => !t.hidden).map(t => t.id);

const { serviceStatus, getObjectUrl, isRendering, prioritize, retryServiceCheck } = useRenderQueue({
  templates: renderTemplates,
  item: proxiedItem ?? null,
  settings: { aspectRatio, showTitle, showRating, showReflection },
  enabled: isOpen && !!proxiedItem,
});
```

- [ ] **Step 8.5：重構 handleShare**

```typescript
const handleShare = async () => {
  const objectUrl = getObjectUrl(selectedTemplate);
  if (!objectUrl) return; // button disabled when null

  setIsSharing(true);
  const shareMessage = `${t.details.shareMessage} ${window.location.origin}`;

  try {
    const cached = getCachedRender(`${selectedTemplate}:${computeSettingsHash({ aspectRatio, showTitle, showRating, showReflection })}`);
    if (!cached) return;
    const blob = cached.blob;

    if (Capacitor.isNativePlatform()) {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const fileNameWithExt = `${fileName}_${Date.now()}.png`;
      const savedFile = await Filesystem.writeFile({
        path: fileNameWithExt,
        data: base64Data,
        directory: Directory.Cache,
      });
      await Share.share({ title, text: shareMessage, url: savedFile.uri });
    } else {
      const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text: shareMessage, files: [file] });
      } else {
        download(objectUrl, `${fileName}.png`);
        setIsDownloaded(true);
        setTimeout(() => setIsDownloaded(false), 2000);
      }
    }
  } catch (error) {
    console.error('Share failed:', error);
    if (!Capacitor.isNativePlatform()) {
      download(objectUrl, `${fileName}.png`);
    }
  } finally {
    setIsSharing(false);
  }
};
```

記得在頂部 import：
```typescript
import { getCachedRender } from '@/lib/render-cache';
import { computeSettingsHash } from '@/lib/share-api';
```

- [ ] **Step 8.6：重構 handleDownload**

```typescript
const handleDownload = () => {
  const objectUrl = getObjectUrl(selectedTemplate);
  if (!objectUrl) return;
  download(objectUrl, `${fileName}.png`);
  setIsDownloaded(true);
  setTimeout(() => setIsDownloaded(false), 2000);
};
```

- [ ] **Step 8.7：更新 Preview 區域**

替換 Preview 區域中的 `<img>` / React component 切換邏輯：

在現有的 visual preview `<div>` 內，於 `<MemoryCardTemplate>` 之上加入 PNG overlay：

```tsx
<div className="relative">
  {proxiedItem && getObjectUrl(selectedTemplate) ? (
    <img
      src={getObjectUrl(selectedTemplate)!}
      alt="preview"
      className="rounded-xl"
      style={{ width: currentDim.width, height: currentDim.height }}
    />
  ) : (
    <div className="bg-folio-black overflow-hidden rounded-xl border border-white/10">
      {proxiedItem ? (
        <MemoryCardTemplate
          {...proxiedItem}
          aspectRatio={aspectRatio}
          selectedTemplate={selectedTemplate}
          showTitle={showTitle}
          showRating={showRating}
          showReflection={showReflection}
        />
      ) : template}
    </div>
  )}
  {/* Loading indicator */}
  {proxiedItem && isRendering(selectedTemplate) && !getObjectUrl(selectedTemplate) && (
    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
      <Loader2 className="animate-spin text-accent-gold" size={32} />
    </div>
  )}
</div>
```

**注意：** 需要從 `MemoryCardTemplate` 的 dimensions 物件取 `currentDim`（在原本的 component 裡沒有，需要在 ShareModal 複製一份或從 props 推算）。可暫時 hardcode `{ width: '400px', height: '711px' }`。

- [ ] **Step 8.8：移除 Hidden Capture Container**

移除：
```tsx
{/* Hidden Capture Container (With Proxied Images) */}
<div className="absolute top-0 left-0 opacity-0 pointer-events-none -z-50">
  <div ref={templateRef} className="bg-folio-black overflow-hidden">
    {proxiedItem ? (
      <MemoryCardTemplate ... />
    ) : template}
  </div>
</div>
```

- [ ] **Step 8.9：更新 service status UI**

在 Controls Drawer 最頂部（Drawer Handle 下方，Controls Content 最前面）加入 status banner：

```tsx
{/* Service status banner */}
{serviceStatus === 'checking' && (
  <div className="flex items-center gap-2 text-xs text-white/60 py-2">
    <Loader2 size={12} className="animate-spin" />
    圖片服務連線中...
  </div>
)}
{serviceStatus === 'error' && (
  <div className="flex items-center justify-between text-xs py-2">
    <span className="text-red-400">圖片服務暫時無法使用</span>
    <button onClick={retryServiceCheck} className="text-accent-gold underline">重試</button>
  </div>
)}
```

- [ ] **Step 8.10：更新 Share 按鈕 disabled 條件**

```tsx
// 分享按鈕：有 objectUrl 才可點擊
disabled={isSharing || !getObjectUrl(selectedTemplate)}
```

- [ ] **Step 8.11：更新模板切換時呼叫 prioritize**

在 template selector 的 `onClick`：

```tsx
onClick={() => {
  setSelectedTemplate(temp.id);
  prioritize(temp.id);
}}
```

- [ ] **Step 8.12：TypeScript build 確認**

```bash
cd client && npx tsc --noEmit 2>&1 | grep -E "ShareModal|error"
```

預期：無 error。

- [ ] **Step 8.13：Commit**

```bash
git add client/src/components/ShareModal.tsx
git commit -m "feat(ShareModal): replace html-to-image with Puppeteer progressive render queue"
```

---

## Task 9：MonthlyRecapModal 重構

**Files:**
- Modify: `client/src/components/MonthlyRecapModal.tsx`（473 行）

MonthlyRecapModal 的結構與 ShareModal 類似，使用相同的 `useRenderQueue` hook 但 templates 不同（`['calendar', 'collage', 'waterfall', 'shelf']`）。

- [ ] **Step 9.1：確認 MonthlyRecapModal 的 item 結構**

```bash
grep -n "statsData\|payload\|item\|render\|POST /render" client/src/components/MonthlyRecapModal.tsx | head -20
```

記錄 MonthlyRecapModal 傳入 MonthlyRecapTemplate 的 props 結構，確認對應的 `/share/render` page.tsx 的 `item` 格式。

- [ ] **Step 9.2：重構（同 Task 8 流程）**

依 Task 8 的步驟對 MonthlyRecapModal 執行相同重構：
- 移除 `toPng` import、`handleCapture`、`waitForAllImages`、`cachedDataUrl`
- 加入 `useRenderQueue`（templates = `['calendar', 'collage', 'waterfall', 'shelf']`）
- 更新 Preview（PNG overlay + loading skeleton）
- 移除 hidden capture container
- 更新 handleShare / handleDownload

**注意：** MonthlyRecapModal 的 item 是 `statsData`（API 回應），傳入 Puppeteer render 的 payload 需包含完整 statsData。

- [ ] **Step 9.3：TypeScript build 確認**

```bash
cd client && npx tsc --noEmit 2>&1 | grep -E "MonthlyRecapModal|error"
```

- [ ] **Step 9.4：Commit**

```bash
git add client/src/components/MonthlyRecapModal.tsx
git commit -m "feat(MonthlyRecapModal): replace html-to-image with Puppeteer progressive render queue"
```

---

## Task 10：移除 html-to-image 依賴

**Files:**
- Modify: `client/package.json`

- [ ] **Step 10.1：確認無殘留 import**

```bash
grep -r "html-to-image\|toPng\|handleCapture\|waitForAllImages\|cachedDataUrl" \
  client/src --include="*.tsx" --include="*.ts"
```

預期：**無任何結果**。若有，返回對應 Task 修復後再繼續。

- [ ] **Step 10.2：移除 package**

```bash
cd client && npm uninstall html-to-image
```

- [ ] **Step 10.3：確認 build 成功**

```bash
cd client && npm run build 2>&1 | tail -20
```

預期：build 成功，無 html-to-image 相關 error。

- [ ] **Step 10.4：Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "chore(frontend): remove html-to-image dependency"
```

---

## Task 11：Railway 部署

- [ ] **Step 11.1：在 Railway 建立 puppeteer-service**

到 Railway Dashboard，在現有 Project 內新增 Service，連接 `puppeteer-service/` 目錄（monorepo root directory 設為 `puppeteer-service`）。

- [ ] **Step 11.2：設定環境變數**

在 Railway Service 設定：
```
ALLOWED_ORIGINS=https://storio.andismtu.com
FRONTEND_URL=https://storio.andismtu.com
PORT=（Railway 自動設定，無需手動填）
```

- [ ] **Step 11.3：部署並驗證 /health**

```bash
curl https://<puppeteer-service>.up.railway.app/health
```

預期：`{"status":"ok","uptime":...}`

- [ ] **Step 11.4：RAM 壓測**

```bash
curl -s -X POST https://<puppeteer-service>.up.railway.app/render \
  -H "Content-Type: application/json" \
  -d '{"template":"calendar","item":{...月份資料...},"settings":{}}' \
  --output /tmp/monthly-recap.png

file /tmp/monthly-recap.png
```

至 Railway Metrics 確認 RAM 峰值。

- [ ] **Step 11.5：在 Vercel 設定環境變數**

在 Vercel Dashboard 新增：
```
NEXT_PUBLIC_PUPPETEER_SERVICE_URL=https://<puppeteer-service>.up.railway.app
```

- [ ] **Step 11.6：Deploy 前端**

```bash
cd client && npm run build && git push
```

---

## Task 12：E2E 驗證

- [ ] **Step 12.1：Mobile Web — ShareModal 基本流程**

瀏覽 `https://storio.andismtu.com`，開啟任一電影/書籍的 ShareModal，確認：
- Queue 自動啟動（不需手動點「產生」）
- 第一張模板在 5s 內出現 PNG preview
- 後續模板陸續就緒

- [ ] **Step 12.2：模板截圖視覺正確**

切換所有可見模板，確認：
- `preserve-3d` 效果正常（3d/shelf 模板）
- `backdrop-blur` 效果正常（ticket 模板）
- 文字、LOGO、海報均清晰

- [ ] **Step 12.3：優先重排**

Queue 進行中，跳到最後一張模板，確認該模板插隊至下一個 render，preview 在合理時間內就緒。

- [ ] **Step 12.4：Settings 變更**

切換 showRating toggle，等 1.5s，確認 cache 失效並重新排隊。

- [ ] **Step 12.5：iOS Native Share（Simulator）**

在 iOS Simulator 開啟 App，確認 Share Sheet 正確觸發並可儲存圖片。

- [ ] **Step 12.6：MonthlyRecapModal 驗證**

開啟月份統計 Modal，確認 4 種模板均可截圖。

- [ ] **Step 12.7：服務異常場景**

暫時停止 Railway puppeteer service，確認 ShareModal 顯示「圖片服務暫時無法使用」錯誤 UI 與重試按鈕。

---

## Memory 更新提醒

> 完成此計畫後，執行者必須在 `/Users/iTubai/.claude/projects/-Users-iTubai-Sites-storio-2/memory/` 建立或更新 project memory，記錄：
> - 哪些 tasks 已完成（含 commit hash）
> - 哪些 tasks 仍未完成
> - 遇到的意外問題與解法
> - Railway puppeteer service 的實際 URL
