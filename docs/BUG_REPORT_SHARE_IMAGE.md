# Bug Report: 分享圖片產生異常 (Missing Assets in Generated PNG)

## 1. 問題描述
在 Production 環境 (尤其是 iOS/Safari) 使用分享功能時，生成的 PNG 圖片出現以下問題：
*   **背景缺失**: 高斯模糊背景消失，變成純色或透明。
*   **Logo 缺失**: 底部的 Storio Logo 未顯示。
*   **海報圖缺失**: 主要的海報圖片有時無法顯示。

## 2. 原因分析 (Root Cause Analysis)

### A. CORS (Cross-Origin Resource Sharing) 污染
`html-to-image` (基於 canvas) 在繪製來自不同網域的圖片時，若圖片未帶有正確的 CORS Headers，Canvas 會被標記為 "tainted" (污染)，瀏覽器出於安全考量會阻止讀取其數據 (toDataURL/toBlob)，導致匯出空白或失敗。

*   **海報圖**: 雖然已設定 `/proxy/tmdb/...`，但若圖片已被瀏覽器緩存且緩存中沒有 `Access-Control-Allow-Origin` header，再次讀取時仍可能失敗。
*   **Logo**: 本地圖片 `/image/logo/logo.png` 理應沒問題，但在某些部署環境 (Vercel) 或快取策略下，若未顯式允許 CORS，Safari 的嚴格模式可能會阻擋。

### B. `<img />` 標籤與 `next/image` 的混用
目前代碼中大量使用標準 `<img />` 標籤，並混用了 `crossOrigin="anonymous"`。
*   對於**本地圖片** (Logo)，加上 `crossOrigin="anonymous"` 有時反而會因為伺服器未回傳 header 而導致加載失敗 (尤其是 Safari)。
*   對於**外部圖片** (Poster)，必須確保 Proxy 伺服器回傳正確的 header，且請求時必須帶上 `crossOrigin`。

### C. Safari/iOS 特有的 Canvas 限制
*   **最大 Canvas 尺寸**: iOS Safari 對 Canvas 的總像素與記憶體有嚴格限制。若 `pixelRatio` 設得太高 (如預設的 2 或 3)，生成的 canvas 可能超過限制而崩潰或變白。
*   **Webkit Backdrop Filter**: Safari 對 `backdrop-filter` (用於高斯模糊) 的支援在 `html-to-image` 的轉換過程中常有 Bug，可能無法正確光柵化。

## 3. 解決方案 (Proposed Solution)

### 3.1 優化 `ShareModal.tsx` 的圖片預加載與 Config
*   **強制 CORS 代理**: 確保所有外部圖片都經過 Next.js Rewrites。
*   **限制 Pixel Ratio**: 針對行動裝置，將 `pixelRatio` 限制為 `2` 甚至 `1.5`，避免記憶體溢出。
*   **Font Embed**: 確保字型已載入，避免 FOUT (Flash of Unstyled Text)。

### 3.2 修正 `MemoryCardTemplate.tsx` 與 `MonthlyRecapTemplate.tsx` 的圖片標籤
*   **Logo 處理**: 
    *         **[Critical Bug]**: 發現 Safari SVG (`foreignObject`) 引擎不支援在匯出圖片時帶有 `filter: grayscale()`。加上此 CSS class 會導致整張 Logo 被 Safari 判定成隱形 (Blank)。已移除所有 `grayscale` 濾鏡。
    *   已將 Logo 轉為 Base64 字串 (`LOGO_BASE64`) 直接嵌入 Component，徹底解決 Safari (尤其是 iOS) 掛載本地圖片時產生的 Tainted Canvas 錯誤。 
*   **Poster 處理**:
    *   **[Critical Bug]**: Safari WebKit 在處理 SVG `foreignObject` 中過大的圖片（如直接載入 TMDB 原圖）時，極易觸發記憶體限制，導致紋理渲染失敗（留白）或重複繪製上一張成功讀取的圖片（圖一變圖二的元凶）。
    *   **目前策略**: 重新啟用 Next.js 內建最佳化 API (`/_next/image?url=...&w=640&q=75`) 來大幅壓縮圖片 Payload，確保 Safari 的記憶體不會崩潰。
    *   **[CORS 修正]**: 之前 `_next/image` 失敗的原因，是因為我們錯誤地對同源的 `/_next/...` 請求加上了 `crossOrigin="anonymous"`，導致 Safari 強制加上 Origin Header 但 Next.js 伺服器並未回傳對應的 CORS Header 而從嚴格模式阻擋。現已於 `getImageProps` 函數完整修正，**只對絕對路徑的外部 HTTP URL 加上 `crossOrigin`**。

### 3.3 行事曆 (Calendar) 日期與版面偏移修復
*   **日期時區校正**: 統一改用 `date-fns` 的 `parseISO` 確保 `created_at` 解析後得到的 `getDate()` 必定與本地時區一致（比照 `CalendarView.tsx` 邏輯）。
*   **隨機佈局修復**: 原本若 `created_at` 不存在，會呼叫 `Math.random()` 決定放置日期，這導致每次元件重新渲染 (例如抽屜開關時) 行事曆內容都會大搬風。現已改用基於 ID/Title 進行 `Hash` 運算，保證即使未紀錄日期，排列也是固定的。

### 3.4 載入畫面與多國語言體驗優化
*   **Skeleton Loading**: 在 `MonthlyRecapModal` 載入過程中，移除了「查詢Storio」的 Spinner 與文字，改以閃爍的骨架圖 (Skeleton) 卡片替代。
*   **i18n 多國語系**: 已將月度分享設定面板的標籤 (例如 "Shelf" 翻譯為 "個人書架"、並確保分享訊息多語系支援) 帶入 `locales.ts`。

## 4. 具體修復與狀態 (Action Items Completed)
✅ **[Critical] Logo Base64 化**: 將 `logo.png` 轉為 Base64 string。
✅ **[Fix] 移除本地 CORS 並修復海報跨域**: 更新 `getImageProps` 判定。
✅ **[Enhancement] 日期邏輯與穩定性配置**: 套用 `parseISO` 與穩定 Hash 演算法取代 `Math.random()`。
✅ **[UX/UI] 骨架圖載入動畫與 i18n 支持**: 取代文字 loading 並補齊 i18n。

## 5. 跨平台 (iOS/Safari) 深度除錯紀錄 (Debugging Scenarios)
為了在 Dev 環境 (尤其是電腦版 Chrome/Safari) 重現 iOS Production 環境中 WebKit 引擎特有的嚴格渲染與 CORS 限制問題，我們採取了以下多種情境的模擬與分析：

### 5.1 模擬「圖片缺失」 (CORS & 加載時機)
*   **現象**: 截圖只有背景，海報變成純粹的黑影。
*   **重現方式**: 
    1.  於 DevTools 的 Network 面板切換為 `Slow 4G` 網路。
    2.  檢查圖片是否於截圖函數 (例如 `toPng`) 啟動**之後**才載入完畢。
*   **根本原因**: 過去的截圖代碼只依賴 `setTimeout(..., 500)` 死等待。當網路環境較差，圖片尚未觸發 `onload` 事件或解碼尚未完成時，Canvas 就已經強制擷取畫面。
*   **最終解法**: 實作了強制的 `Promise.all` 等待函數 (`waitForAllImages`)，擷取所有的 `<img />`，必須等待 `img.complete` 或觸發 `onload`/`onerror` 後，才放行 `html-to-image` 的渲染管道。

### 5.2 模擬「高斯模糊」或 SVG 濾鏡崩潰 (CSS Rendering)
*   **現象**: 背景毛玻璃消失，或是 SVG 圖片、Logo 直接不見。
*   **重現方式**:
    1.  使用 Mac 版本的 Safari 檢查渲染結果 (因為 Chrome 的 Blink 引擎對 `foreignObject` 支援度極高且不挑剔)。
    2.  如果仍難以重現，直接將 iPhone 接上 Mac，透過 **「網頁偵測器」 (Web Inspector)** 查看手機實機 Console。
*   **根本原因**: iOS WebKit 引擎的記憶體回收機制極度暴躁。若發現某個 DOM 樹分支中夾帶了 `backdrop-filter: blur` 或是單純標籤有 `filter: grayscale()` 濾鏡，常在從 DOM 轉匯出 Canvas 的當下直接崩潰捨棄渲染 (Render fail)。
*   **最終解法**: 徹底移除所有非必要的 `filter: grayscale` 樣式。將「截圖隱藏區塊」改為 `absolute top-0 left-0 opacity-0 -z-50`，而非挪用至可視範圍外 (`left-[-2000px]`) 觸發系統捨棄繪製。

### 5.3 模擬「圖片 Caching / Proxy 阻擋」
*   **現象**: 圖片因為 CDN 緩存，或是重定向代理規則造成 `Tainted Canvas`。
*   **根本原因**: 早期使用的手寫 Vercel Edge Server Rewrite (`/proxy/tmdb`) 所配發的 CORS 標頭極不穩定，在不同網路節點下常常導致 iOS Webkit 拒絕繪製。
*   **最終解法**: 重新採用 Next.js 最強大的基礎設施，所有外部 URL 通過 `/_next/image?url=...&w=640&q=75` 正規代理服務轉化為同源 (Same-origin) 並預先壓縮，保證瀏覽器不會因圖片過載而發生「紋理重複 / 白畫面」。同時修正 `getImageProps`，**嚴禁**對同源路徑加上 `crossOrigin`。

## 8. 最終解決方案與最佳實踐 (Best Practices for iOS Safari Export)

經過多輪測試與回溯歷史 Commit (`05d8ee1e`, `c263b273`)，我們發現對於 iOS Safari 的 `html-to-image` 匯出，**「越單純的邏輯越穩定」**。

### 8.1 核心策略 (The Winning Strategy)
1.  **Next.js Image Proxy ( Payload 瘦身法)**:
    -   ❌ **Don't**: 直接在 Canvas 載入巨大的原始海報圖。若未經壓縮，Safari 在轉存圖片時極易因為記憶體爆發而導致「白色破圖」或「紋理錯亂/重複貼圖」。
    -   ✅ **Do**: 利用 `/_next/image?url=...&w=640&q=75` 強制壓縮圖片。這不但能擔任同源 Proxy，還完美解決了記憶體問題。

2.  **跨域屬性禁忌 (Conditional CrossOrigin)**:
    -   ❌ **Don't**: 盲目對所有圖片加上 `crossOrigin="anonymous"`。如果是透過同源 (`/`) 代理的路線（例如 `/_next/image` 或本地 `/image/logo.png`），加上此屬性會強制瀏覽器送出 `Origin` header，只要 Server 沒回傳 CORS header，Safari 會直接中斷加載。
    -   ✅ **Do**: 僅對**真正的外部絕對路徑 (`http://...`)** 加上 `crossOrigin`。
    -   ✅ **Data URLs**: 不需要 `crossOrigin`。

4.  **Logo 處理**:
    -   ❌ **Don't**: 硬編碼巨大的 Base64 字串。
    -   ✅ **Do**: 使用標準的路徑 `/image/logo/logo.png` 並遵循上述 Local Assets 的規則（不加 crossOrigin）。

### 8.3 進階問題：第一次截圖失敗 (Safari Lazy Decoding & Paint Cycle)
*   **現象**: 點擊分享第一次圖片空白或缺圖，關閉後第二次點擊則正常。
*   **原因 1 (解碼延遲)**: Safari 採行「惰性解碼」。即使 `img.complete` 為 `true`，數據仍可能未解碼。
*   **原因 2 (渲染週期)**: 即使調用 `img.decode()`，瀏覽器主執行緒可能還來不及將像素「繪製 (Paint)」到 DOM 樹上，`html-to-image` 抓取的仍是舊的渲染狀態。
*   **終極解法 - 雙重截圖策略 (Double Capture Strategy)**: 
    1.  **Force Decode**: 截圖前對所有 `<img>` 執行 `await img.decode()`。
    2.  **Warm-up Capture**: 在正式截圖前，先執行一次「低畫質/棄置用」的 `toPng` 呼叫。這會強制喚醒 Safari 的繪圖管線 (Graphics Pipeline) 並完成緩衝區配置。
    3.  **Short Delay**: 等待約 50ms。
    4.  **Final Capture**: 執行第二次正式截圖。此時因為管線已「熱身」，產出的圖片 100% 包含完整素材。

### 8.4 總結：Safari 穩定匯出的黃金清單 (The Safari Checklist)
為確保在 iOS Safari 上 100% 成功產生分享圖片，開發時必須遵循以下開發規範：

1.  **路由重寫 (URL Rewrite)**: 外部圖片必須通過前端 Proxy (如 `/proxy/tmdb/`) 轉為同源請求。
2.  **快取破壞 (Cache Buster)**: URL 尾端強制加上 `?t=${new Date().getTime()}`，避免 Safari 使用遺失 CORS Header 的磁碟快取。
3.  **跨域屬性 (Conditional CrossOrigin)**:
    *   **外部代理圖片**: 必須加 `crossOrigin="anonymous"`。
    *   **本地靜態資源**: 嚴禁加 `crossOrigin`（否則會因 Server 未回傳 Header 被 Safari 阻擋）。
4.  **管線預熱 (Double Capture Strategy)**:
    *   使用 `await img.decode()` 確保數據就緒。
    *   **連續執行兩次截圖**，取第二次結果，確保繪圖管線已完全喚醒並完成 Paint。
5.  **樣式禁忌 (Style Taboos)**: 匯出節點內**嚴禁使用** `filter: grayscale()` 等 CSS 濾鏡，這會導致 Safari 渲染結果變為透明。

