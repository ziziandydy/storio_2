## Context

Storio 的分享圖片功能（ShareModal）使用 `html-to-image` 在前端截圖。此方案在 Safari/WKWebView 有結構性的平台層限制：`preserve-3d`、`backdrop-filter`、`blur` 截圖失真；Monthly Recap 在低記憶體機型 OOM 崩潰；LOGO_PATH timestamp cache-busting 導致截圖時圖片消失。三輪修補已確認這些問題無法透過修補根治。

**現況：**
- `ShareModal.tsx`：前端 DOM → `html-to-image.toPng()` → PNG Blob
- 隱藏 capture container（`opacity-0 -z-50` 的第二個 MemoryCardTemplate 實例）作為截圖對象
- Preview（Modal 內 React component）≠ Output（html-to-image 截圖），因 blur/3d 等效果在截圖中失真

**目標狀態：**
- Puppeteer（真實 Chromium）在 server-side 截圖，統一兩個平台路徑
- Preview = Output（用戶看到的就是最終圖片）
- 所有 10 個現有模板零修改

## Goals / Non-Goals

**Goals:**
- 讓 MemoryCardTemplate（6 種）和 MonthlyRecapTemplate（4 種）在 Mobile Web 和 iOS Native App 均可靠截圖
- 移除所有 html-to-image 相關邏輯，消除 Safari 截圖的結構性不穩定問題
- 統一兩平台截圖路徑（`isNativePlatform()` 僅決定最後的 share/download 行為）
- 實現 Progressive Render Queue：用戶打開分享時圖片逐步就緒，滑到哪張哪張 ready
- 消除 Render cold start 對用戶體驗的影響

**Non-Goals:**
- 修改任何模板 UI 程式碼（MemoryCardTemplate / MonthlyRecapTemplate）
- 移動 Storio 主要 Next.js App 至 SSR（保持 static export for Capacitor）
- 新增模板種類
- 後端（Railway FastAPI）變更

## Decisions

### D1：Puppeteer 微服務部署至 Render

**選擇：** 獨立 Node.js Puppeteer 服務，部署至 Render。

**為何不選其他：**
- Satori / @vercel/og：10 個模板中 5 個用到 `filter:blur`、`backdrop-filter`、`mix-blend-mode`、`preserve-3d`，Satori 完全不支援
- Canvas API：需手刻每個模板的座標、換行、z-index；新增模板成本極高；與 React component 脫鉤
- 繼續修補 html-to-image：已確認是 WebKit platform-level 限制，無法繞過

**Chromium 優化旗標（必填，確保 512MB 環境穩定）：**
```js
puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',   // 最關鍵：避免 /dev/shm 64MB 限制 OOM
    '--disable-gpu',
    '--single-process',
    '--no-zygote'
  ]
})
```
預期 RAM 使用量（優化後）：230-330MB，在 Render 512MB 可行。

### D2：Progressive Render Queue（核心 UX 決策）

**選擇：** 用戶點擊分享時，立即開始 render 當前選中模板，同時依序 queue 其餘模板；PNG 結果以 TTL Cache 儲存。

**為何不選其他兩種：**

| 方案 | 第一張等待 | 後續模板 | RAM | Preview=Output |
|------|-----------|----------|-----|----------------|
| On-demand（每次手動點產生）| 3-5s | 每次 3-5s | 安全 | ✅ |
| Batch 全部一起產 | 20-30s | Ready | 🔴 OOM 風險 | ✅ |
| **Progressive Queue（選定）** | **3-5s** | **通常已 Ready** | **安全（sequential）** | **✅** |

Progressive Queue 是 UX 最好且 RAM 安全的方案。

**Queue 機制：**
```
用戶點分享，當前模板為 T3：
  queue = [T3*, T1, T2, T4, T5, T6]  (* = 立即開始)

用戶看 T3 時（3-5s）：T1 也完成了
用戶滑到 T5：
  queue 重排 = [T5*, T4, T6]  (T3/T1 已 cache，T2 也完成了)
  下一張立即跑 T5
```

**TTL Cache 設計：**
```ts
type RenderCache = Map<string, {
  blob: Blob,
  url: string,       // URL.createObjectURL(blob)
  expiresAt: number  // Date.now() + 5 * 60 * 1000
}>

// Cache key = templateId + settingsHash
// 設定（如 showRating）變更時 hash 變化，自動 miss cache
```

**Cache 失效時機：**
- TTL 到期（5 分鐘）
- 共用設定變更（showRating、背景主題等）→ settingsHash 變化 → 全部 miss → 重新 queue

### D3：資料傳遞方式 — `page.evaluate()` inject pattern

**選擇：** Puppeteer 透過 `page.evaluate()` 將渲染資料注入至 `window.__RENDER_DATA__`，不使用 URL query params。

**為何不用 URL params：**
- Monthly Recap 9 張 poster URL + metadata 可能超過 2000 chars
- TMDB poster URL 經 URL encoding 後碎片化，易出錯
- Inject pattern 是 server-side Puppeteer screenshot 的業界標準做法

**資料流：**
```
POST /render { template, item, settings } → puppeteer-service
  → browser.newPage()
  → page.goto('https://storio.andismtu.com/share/render')
  → page.evaluate((data) => { window.__RENDER_DATA__ = data }, payload)
  → page.waitForFunction(() => window.__RENDER_READY__ === true, { timeout: 30000 })
  → page.screenshot({ type: 'png' })
  → page.close()
  → return PNG buffer
```

### D4：`/share/render` 為 client-side 靜態頁面

**選擇：** Next.js client component，讀取 `window.__RENDER_DATA__`，渲染模板，設置 `window.__RENDER_READY__ = true`。

**為何不用 SSR：** Storio 使用 `output: 'export'`（靜態輸出）因為 Capacitor iOS 需要靜態檔案本地服務。改 SSR 影響範圍太大。

**ready 信號機制：**
```tsx
useEffect(() => {
  const poll = setInterval(() => {
    const data = (window as any).__RENDER_DATA__
    if (!data) return
    clearInterval(poll)
    setRenderData(data)
    document.fonts.ready.then(() => {
      (window as any).__RENDER_READY__ = true
    })
  }, 100)
  return () => clearInterval(poll)
}, [])
```

### D5：Cold Start 雙層預熱

**問題：** Render 免費方案 15 分鐘無活動後自動 sleep。單純 ping-on-app-open 無法防止用戶瀏覽 20 分鐘後再分享時的 cold start。

**選擇：** 雙層預熱策略。

```
Layer 1: App 開啟時 → 立即 ping /health（解決初始 cold start）
Layer 2: 定期 heartbeat → 每 10 分鐘 ping /health（防止 15 分鐘 sleep 重置）

heartbeat 在 App 前景時啟動，進入背景時暫停（避免浪費 Render 免費額度）
```

**ShareModal 補充 health check（第三層保底）：**
```
Modal 開啟 → GET /health（3s timeout）
  ├─ 200 OK → 立即開始 queue
  ├─ 失敗/超時 → 顯示「圖片服務準備中...」spinner，每 3s 重試
  └─ 60s 無回應 → 顯示「稍後再試」+ 重試按鈕
```

### D6：兩平台最終 Share 行為分離

```
Progressive Queue → PNG Blob（cache 中）
  ├─ isNativePlatform() = true
  │    → Capacitor.Filesystem.writeFile() → Capacitor.Share.share()
  └─ isNativePlatform() = false
       → navigator.share({ files: [pngFile] }) 或 <a download> fallback
```

## Risks / Trade-offs

| 風險 | 嚴重度 | 緩解 |
|------|--------|------|
| Render 512MB RAM 不足 | 🔴 高 | Chromium 優化旗標；Sequential queue 確保同一時間只有一個 page；首次部署後壓測 Monthly Recap |
| 用戶直接跳到最後一張模板 | 🟡 中 | Queue 優先重排；當前 render 跑完後立即切換至目標模板（不中斷進行中的 render，避免 Puppeteer page 強制關閉） |
| 設定變更導致全部 cache 失效 | 🟡 中 | settingsHash debounce（用戶停止操作 1.5s 後才觸發重新 queue）；避免每次 toggle 都重跑 |
| Heartbeat 消耗 Render 免費額度 | 🟡 中 | App 進入背景時暫停 heartbeat；10 分鐘間隔遠低於觸發額度上限 |
| Monthly Recap 單張 render 較慢（8-12s） | 🟡 中 | 4 個 Recap 模板通常不會全部瀏覽；sequential queue 不影響第一張速度 |
| TMDB poster URL 從 Render server fetch — IP block | 🟡 中 | 備選：透過 Storio Next.js `/api/proxy` 路由取用（與現有 proxy 一致） |

## Migration Plan

1. **部署 puppeteer-service 至 Render** → 測試 `/health`、`/render` endpoint，量測 RAM
2. **RAM 壓測**：Monthly Recap（9 張 poster）確認不 OOM
3. **新增 `/share/render` 頁面**，本地驗證 inject pattern 與 ready signal 正常
4. **實作 Progressive Queue + TTL Cache**，先在 ShareModal 並行保留舊路徑（feature flag）
5. **驗證**：Mobile Web + iOS Simulator，所有 10 個模板截圖視覺正確，確認 Preview = Output
6. **移除 html-to-image** 舊路徑及所有 cleanup（hidden container、timestamp URLs 等）

**Rollback：** 步驟 4-5 期間 feature flag 保留舊路徑，驗證通過後才執行步驟 6。

## Open Questions

- [ ] Heartbeat 在 Capacitor iOS background mode 是否可靠？需確認 `visibilitychange` 事件在 iOS PWA/Capacitor 的行為
- [ ] Monthly Recap payload 結構：9 個 item 各含 posterUrl + title + year，POST body 大小約多少？
- [ ] Puppeteer page 關閉後 `URL.createObjectURL` Blob 是否需要手動 `revokeObjectURL`？（TTL cleanup 時處理）
- [ ] iOS Native：`Capacitor.Filesystem.writeFile()` 寫入 PNG 的目錄選擇（`CACHE` vs `DOCUMENTS`）？
