## Why

分享圖片功能（ShareModal）目前使用 `html-to-image` 在前端將 React/CSS 模板轉成 PNG。此方案在 Mobile Safari（PWA/manifest）有結構性的不穩定問題，而 Capacitor native app 雖未在真機上驗證，但同樣使用 WKWebView（Safari 引擎），面臨相同的根本限制：`preserve-3d`、`backdrop-filter`、`blur` 截圖失真、Monthly Recap 在低記憶體機型 OOM 崩潰，以及 LOGO_PATH cache-busting 導致截圖時圖片消失。這些問題無法透過修補根治，需要從架構層面重構，統一兩個平台的截圖路徑。

## What Changes

- **新增** Puppeteer 截圖微服務，部署於 Render，作為獨立 Node.js HTTP 服務（**必須使用 Chromium 優化旗標**：`--no-sandbox`、`--disable-setuid-sandbox`、`--disable-dev-shm-usage`、`--disable-gpu`、`--single-process`，確保在 512MB 環境下穩定運作）
- **新增** Next.js client-side 模板渲染路由（`/share/render`），供 Puppeteer 導航截圖（**資料透過 `page.evaluate()` inject 至 `window.__RENDER_DATA__`，不使用 URL params**，相容 static export，無 URL 長度限制）
- **重構** `ShareModal.tsx`：採用 **Progressive Render Queue** 策略——用戶點擊分享時立即開始 render 當前模板，同時將其餘模板依序排入 queue 背景處理；用戶瀏覽模板時圖片逐步就緒，達到「預覽即輸出（Preview = Output）」的體驗
  - Queue 支援優先重排：用戶跳到指定模板時，該模板插隊至 queue 最前
  - 圖片 Blob 以 TTL（5 分鐘）Cache 於 client，設定變更時自動失效
  - iOS Native App → Puppeteer 產圖 → `Capacitor.Filesystem` + `Capacitor.Share`
  - Mobile Web → Puppeteer 產圖 → `navigator.share` / download
- **新增** Cold start 雙層預熱：
  1. App 開啟時靜默 ping（fire-and-forget）
  2. 定期 heartbeat ping（每 10 分鐘，防止 Render 15 分鐘 sleep 重置）
  - ShareModal 開啟時加入 health check，cold start 中顯示「圖片服務準備中...」+ spinner，逾時顯示錯誤與重試按鈕
- **保留** 所有現有模板（MemoryCardTemplate 6 種 + MonthlyRecapTemplate 4 種）完全不動
- **移除** `image-utils.ts` 中的 `_t` timestamp / `salt` cache-busting（Puppeteer 路徑不需要）
- **移除** `MemoryCardTemplate.tsx` 中 `LOGO_PATH` / `DESK_BG_PATH` 的 `new Date().getTime()`（改為穩定路徑）
- **移除** Hidden capture container（`opacity-0 -z-50` 的第二個 MemoryCardTemplate 實例）
- **移除** `html-to-image` 相關的所有截圖邏輯（`handleCapture`、`waitForAllImages`、double capture strategy）

## Capabilities

### New Capabilities
- `puppeteer-screenshot-service`：獨立 Node.js 服務，接受模板參數（POST body），透過 `page.evaluate()` 將資料 inject 至 `/share/render` 頁面，等待 `window.__RENDER_READY__` 信號後截圖，返回 PNG blob；使用 Chromium 優化旗標降低 RAM 消耗至 ~230-330MB；Sequential 處理保持 RAM 安全
- `share-render-route`：Next.js client-side 靜態頁面，從 `window.__RENDER_DATA__` 讀取渲染參數，渲染對應模板，完成後設置 `window.__RENDER_READY__ = true`；相容 static export，不需要 SSR
- `share-platform-router`：ShareModal 內的 Progressive Render Queue 管理器——按順序 render 所有模板、優先重排、TTL cache、cold start UI；以及 App 層級的雙層預熱機制（ping-on-open + heartbeat）

### Modified Capabilities
- `native-integrations`：分享行為重構，圖片生成統一走 Puppeteer；`isNativePlatform()` 僅用於決定最後的 share/download 行為，不再影響截圖路徑

## Impact

**前端（client/）**
- `src/components/ShareModal.tsx`：移除 html-to-image 邏輯，實作 Progressive Render Queue + TTL cache + 優先重排邏輯
- `src/components/share/MemoryCardTemplate.tsx`：移除 `LOGO_PATH`/`DESK_BG_PATH` 的 timestamp
- `src/app/share/render/page.tsx`（新增）：client-side 靜態渲染路由，讀取 `window.__RENDER_DATA__` 渲染模板，設置 `window.__RENDER_READY__` 信號
- `src/lib/share-api.ts`（新增）：Puppeteer service 的 API client
- `src/hooks/useRenderServiceWarmup.ts`（新增）：App 開啟時靜默 ping + 定期 heartbeat，防止 Render sleep

**驗證要求（首次部署後必跑）**
- RAM 壓測：渲染 Monthly Recap（最重量模板，9 張 poster），確認 Render 512MB 不 OOM
- Cold start 驗證：停止 heartbeat 後手動觸發 cold start，確認等待 UI 正常顯示
- 升級路徑：若 RAM 不足，升 Render Starter（$7/月，512MB，不睡眠）或 Standard（$25/月，2GB）

**新增外部服務**
- `puppeteer-service/`（新增 Node.js 專案）：部署至 Render

**移除依賴**
- `html-to-image` npm package（可從 package.json 移除）

**不受影響**
- Railway FastAPI 後端
- Supabase
- 所有模板 UI 程式碼
