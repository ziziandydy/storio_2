## 1. Puppeteer Service 建立

- [x] 1.1 在 repo 根目錄建立 `puppeteer-service/` 目錄，初始化 `package.json`（Node.js 20，ESM）
- [x] 1.2 安裝依賴：`puppeteer`、`express`、`cors`
- [x] 1.3 實作 `src/index.js`：Express server，掛載 `GET /health` 和 `POST /render` endpoint
- [x] 1.4 實作 `GET /health`：返回 `{ status: "ok", uptime: process.uptime() }`
- [x] 1.5 實作 Puppeteer browser 初始化（單例，搭配 `--no-sandbox`、`--disable-setuid-sandbox`、`--disable-dev-shm-usage`、`--disable-gpu`、`--single-process`、`--no-zygote`）
- [x] 1.6 實作 `POST /render`：接受 JSON payload、開新 page、navigate 至 `/share/render`、inject `window.__RENDER_DATA__`、poll `window.__RENDER_READY__`（timeout 30s）、截圖返回 PNG buffer、`page.close()` 釋放記憶體
- [x] 1.7 加入 CORS middleware（允許 `https://storio.andismtu.com`、`capacitor://localhost`、`http://localhost:3000`）
- [x] 1.8 加入請求驗證：缺少 `template` 或 `item` 時返回 HTTP 400
- [x] 1.9 加入錯誤處理：Puppeteer timeout 返回 HTTP 504，其他錯誤返回 HTTP 500
- [x] 1.10 建立 `render.yaml`（Render 部署配置）：Node 20、`npm start`、免費方案

## 2. Puppeteer Service 本地驗證

- [x] 2.1 本地啟動 `puppeteer-service`，`curl GET /health` 確認 200 OK
- [x] 2.2 本地 `POST /render` 用 default 模板測試截圖，確認返回有效 PNG
- [ ] 2.3 測試 Monthly Recap（最重量模板，9 張 poster）截圖，確認無 OOM
- [ ] 2.4 量測本地 RAM 使用量（`process.memoryUsage()` + Chromium RSS），確認在可接受範圍

## 3. `/share/render` 頁面建立（前端）

- [x] 3.1 建立 `client/src/app/share/render/page.tsx`（use client component）
- [x] 3.2 實作 `window.__RENDER_DATA__` polling：useEffect 每 100ms 檢查，最多等 10s
- [x] 3.3 根據 `renderData.template` 渲染對應模板：MemoryCardTemplate（6 種）或 MonthlyRecapTemplate（4 種）
- [x] 3.4 實作 ready signal：`document.fonts.ready.then(() => { window.__RENDER_READY__ = true })`
- [x] 3.5 確保頁面無 application chrome（無 NavigationFAB、無 header、body 僅含模板）
- [x] 3.6 加入 TypeScript 型別宣告：`declare global { interface Window { __RENDER_DATA__: RenderPayload; __RENDER_READY__: boolean } }`
- [x] 3.7 建立 `next build` 驗證：確認 `/share/render` 包含在靜態輸出中

## 4. Share API Client 建立（前端）

- [x] 4.1 建立 `client/src/lib/share-api.ts`：`renderShareImage(payload: RenderPayload): Promise<Blob>` 函式
- [x] 4.2 實作 `POST /render` 呼叫（fetch to `NEXT_PUBLIC_PUPPETEER_SERVICE_URL`），返回 PNG Blob
- [x] 4.3 加入 `getRenderServiceHealth(): Promise<boolean>` 函式（`GET /health` with 3s timeout）
- [x] 4.4 在 `client/.env.local.example` 新增 `NEXT_PUBLIC_PUPPETEER_SERVICE_URL=http://localhost:4000`
- [x] 4.5 建立 `RenderPayload` 型別（包含 `template`、`item`、`settings`）
- [x] 4.6 建立 `computeSettingsHash(settings: RenderSettings): string` 函式（JSON.stringify + 簡單 hash），用於 cache key 生成

## 5. Render 服務雙層預熱（前端）

- [x] 5.1 建立 `client/src/hooks/useRenderServiceWarmup.ts`：App 掛載時靜默 `GET /health`（fire-and-forget，不顯示任何錯誤 UI）
- [x] 5.2 在 `useRenderServiceWarmup` 加入 heartbeat：App 在前景時每 10 分鐘 ping 一次（防止 Render 15 分鐘 sleep）
- [x] 5.3 使用 `document.visibilitychange` 事件控制 heartbeat：頁面進入背景時 `clearInterval`，回到前景時重新啟動
- [x] 5.4 在 `client/src/app/layout.tsx` 或根 component 掛載 `useRenderServiceWarmup`

## 6. Progressive Render Queue 實作（前端）

- [x] 6.1 建立 TTL Cache 資料結構：`Map<string, { blob: Blob, objectUrl: string, expiresAt: number }>`，cache key = `${templateId}:${settingsHash}`
- [x] 6.2 建立 `getCachedRender(key)` / `setCachedRender(key, blob)` / `invalidateCache()` helper，`setCachedRender` 建立 `URL.createObjectURL` 並設 TTL（5 分鐘），過期時自動 `revokeObjectURL`
- [x] 6.3 建立 render queue state：`queue: TemplateId[]`（待渲染順序）+ `isRendering: boolean`（是否有進行中的 render）
- [x] 6.4 實作 `buildInitialQueue(currentTemplate, allTemplates): TemplateId[]`：當前模板排第一，其餘依序排列
- [x] 6.5 實作 `prioritize(targetTemplate)` 函式：若 `targetTemplate` 在 queue 中，將其移至最前；若已在 cache 則不入 queue
- [x] 6.6 實作 queue processor：`processQueue()` 從 queue 取第一項，呼叫 `renderShareImage`，結果存入 cache，完成後繼續處理下一項，直到 queue 清空
- [x] 6.7 設定變更時的 cache 失效：監聽 `settings` 變化，加入 1.5s debounce，debounce 結束後呼叫 `invalidateCache()` 並重新初始化 queue

## 7. ShareModal 重構

- [x] 7.1 加入 service health check state（`'idle' | 'checking' | 'ready' | 'cold' | 'timeout' | 'error'`）
- [x] 7.2 Modal 開啟時觸發 `getRenderServiceHealth()`：ready → 立即啟動 queue；cold → 每 3s 重試，最多 60s；timeout → 顯示錯誤 + 重試按鈕
- [x] 7.3 加入 cold start waiting UI：「圖片服務準備中...」spinner（Storio Gold 色），服務就緒後自動切換至正常 UI 並啟動 queue
- [x] 7.4 服務就緒後自動呼叫 `buildInitialQueue(currentTemplate)` 並啟動 `processQueue()`（不需要用戶手動點「產生」）
- [x] 7.5 模板切換時（用戶滑動）：呼叫 `prioritize(targetTemplate)`，cache hit → 立即顯示 PNG；cache miss → 顯示 loading skeleton，等待 queue 處理完成
- [x] 7.6 顯示邏輯：模板有 cache 時顯示 PNG（`<img src={objectUrl} />`）；無 cache 時顯示 React component 預覽 + loading indicator
- [x] 7.7 分享按鈕：從 cache 取當前模板的 PNG Blob，若尚未就緒則顯示「請稍候」並等待當前模板 render 完成
- [x] 7.8 移除 `html-to-image` import 和 `toPng` 呼叫
- [x] 7.9 移除 `handleCapture`、`waitForAllImages`、double capture strategy 函式
- [x] 7.10 移除隱藏 capture container（`opacity-0 -z-50` 的第二個 MemoryCardTemplate 實例）
- [x] 7.11 保留 `isNativePlatform()` 判斷，用於決定最後的 share 行為（Capacitor.Share vs navigator.share vs download）
- [x] 7.12 實作 iOS Native share：PNG Blob → `Capacitor.Filesystem.writeFile()` → `Capacitor.Share.share()`
- [x] 7.13 實作 Mobile Web share：`navigator.share({ files: [pngFile] })` with `<a download>` fallback
- [x] 7.14 Modal 關閉時清理：呼叫所有 cache 中的 `URL.revokeObjectURL`，清空 cache 和 queue

## 8. MemoryCardTemplate cleanup

- [x] 8.1 移除 `client/src/components/share/MemoryCardTemplate.tsx` 中 `LOGO_PATH` 的 `new Date().getTime()` timestamp
- [x] 8.2 移除 `DESK_BG_PATH` 的 `new Date().getTime()` timestamp
- [x] 8.3 確認移除後 Modal 預覽中 LOGO 和 DESK_BG 圖片正常顯示

## 9. image-utils.ts cleanup

- [x] 9.1 移除 `client/src/lib/image-utils.ts` 中 `getOptimizedShareImageUrl()` 的 `_t` timestamp 參數
- [x] 9.2 移除 `salt` 隨機值生成邏輯
- [x] 9.3 確認 `proxiedItem` 的 `useMemo` 依賴不再包含 random URL

## 10. 移除 html-to-image 依賴

- [x] 10.1 從 `client/package.json` 移除 `html-to-image`
- [x] 10.2 執行 `pnpm install` 確認 lock file 更新
- [x] 10.3 確認無其他元件 import `html-to-image`

## 11. Render 部署與驗證

- [ ] 11.1 在 Render 建立新的 Web Service（免費方案），連接 `puppeteer-service/` 目錄
- [ ] 11.2 設定環境變數：`ALLOWED_ORIGINS=https://storio.andismtu.com`
- [ ] 11.3 部署後 `curl GET https://<render-service>.onrender.com/health` 確認 200 OK
- [ ] 11.4 **RAM 壓測**：`POST /render` 用 Monthly Recap + 9 張 poster，確認無 OOM；記錄 RAM 峰值
- [ ] 11.5 在 Vercel 環境變數設定 `NEXT_PUBLIC_PUPPETEER_SERVICE_URL=https://<render-service>.onrender.com`
- [ ] 11.6 部署前端，在 production URL 測試 `/share/render` 頁面可存取

## 12. E2E 驗證

- [ ] 12.1 Mobile Web（Safari）：打開 ShareModal，確認 queue 自動啟動，6 種 MemoryCardTemplate 依序 render 完成
- [ ] 12.2 Mobile Web（Safari）：所有 6 種模板截圖正確（preserve-3d、backdrop-blur 正常渲染）
- [ ] 12.3 Mobile Web（Safari）：所有 4 種 MonthlyRecapTemplate 截圖正確
- [ ] 12.4 iOS Simulator：MemoryCardTemplate default 模板截圖並觸發 iOS Share Sheet
- [ ] 12.5 確認 Preview = Output：cache 中的 PNG 與 Modal 預覽視覺一致
- [ ] 12.6 優先重排驗證：queue 進行中，直接滑到最後一個模板，確認該模板插隊至下一個 render
- [ ] 12.7 設定變更驗證：切換 showRating toggle，確認 cache 失效（1.5s debounce 後）並重新 queue
- [ ] 12.8 Cold start 場景：停止 heartbeat 並等待 Render sleep，重新分享確認「圖片服務準備中...」UI 正常顯示
- [ ] 12.9 Heartbeat 驗證：App 維持前景 11 分鐘，確認 Render 未 sleep（health endpoint 仍回 200）
