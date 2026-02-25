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
    *   **UI 濾鏡渲染**: 在某些情況下，DOM 上的 CSS Filter (如 `filter: grayscale()`) 在轉入 Canvas 渲染時會導致大量額外記憶體消耗或計算失敗，因此簡化了分享模板中的濾鏡依賴。
    *   已將 Logo 轉為 Base64 字串 (`LOGO_BASE64`) 直接嵌入 Component，徹底解決本地圖片可能未帶有跨域標記而間接引發的存取風險。
*   **Poster 處理**:
    *   **iOS 記憶體限制 (OOM)**: Safari WebKit 在單一進程處理包含超巨大 Base64 圖檔的 SVG `foreignObject` 時，極易觸發其嚴格的記憶體上限 (Jetsam Limit)，導致進程中斷或 Canvas 遭清空白板。
    *   **目前策略**: 啟用 Next.js Proxy (`/_next/image?...w=384`) 大幅壓縮圖片 Payload 以減輕行動裝置 GPU 負擔。
    *   **[CORS 修正]**: 針對所有 Proxy 圖片附加 `crossOrigin="anonymous"`，確保寫入 Disk Cache 的圖檔帶有明確的跨域標記，防止後續 Canvas 讀取到無標記的快取 (Opaque Cache) 而觸發 Tainted 錯誤。

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

### 5.2 大量圖片 + 特效引發 OOM (Out Of Memory)
*   **現象**: 背景毛玻璃消失，或是 SVG 圖片、Logo 直接不見，嚴重時截圖全部變白。
*   **重現方式**: 在 iOS 實機上生成九宮格分享圖。
*   **根本原因**: 為了美觀所使用的 CSS 濾鏡 (如 `backdrop-filter` 或是 `filter: grayscale()`)，在與超大 Base64 字串同時擠入一個極度複雜的 Canvas 節點時，會大幅增加記憶體峰值消耗。這極易觸發 iOS 嚴格的記憶體使用上限 (Jetsam Limit)，從而導致系統強制終結渲染任務，甚至引發閃退。
*   **最終解法**: 除了極限壓縮圖片體積外，徹底移除會強制建立額外繪圖合成層的 `filter: grayscale()`。並將「截圖隱藏區塊」放在固定位置並設定 `opacity-0 -z-50`。

### 5.3 防止不透明快取污染 Canvas (Opaque Cache 防禦)
*   **現象**: 大量圖片雖然成功顯示在 DOM 上，但在 `html-to-image` 導出階段產生 `Tainted Canvas` 而無法生成圖片。
*   **根本原因**: 即便 `/_next/image` 屬於同源路徑，普通的 `<img src="...">` 標籤在獲取請求後，會在瀏覽器留下**無 CORS 標記**的實體磁碟快取。當 Canvas (`fetch` 或以安全模式建構的新 `Image`) 稍後嘗試拉取同一張圖片時，基於安全考量，瀏覽器會直接餵回這份被標記為不透明 (Opaque) 的快取並觸發跨域阻擋。
*   **最終解法**: 對所有 Proxy 路徑強加 `crossOrigin="anonymous"`，確保即使是第一次載入進 DOM 時，圖片在快取層級都是以附帶乾淨 CORS 放行標記的狀態被存下，徹底剷除接下來 Canvas 被 Tainted 的可能性。

## 8. 最終解決方案與最佳實踐 (Best Practices for iOS Safari Export)

經過多輪測試與回溯歷史 Commit (`05d8ee1e`, `c263b273`)，我們發現對於 iOS Safari 的 `html-to-image` 匯出，**「越單純的邏輯越穩定」**。

### 8.1 核心策略 (The Winning Strategy)
## 最終解法總結 (Final Solution)

經過深入追蹤 `html-to-image` 原始碼，我們發現了真正的元凶：**`html-to-image` 內部的快取機制缺陷**。

### 根本原因 (Root Cause: Cache Key Truncation)
當 `html-to-image` 嘗試將圖片網址轉換為 Base64 時，為了避免重複發送請求，它維護了一個全域快取字典。
在其內部函數 `getCacheKey()` 中：
```javascript
export function getCacheKey(url, contentType, includeQueryParams) {
    let key = url.replace(/\?.*/, ''); // 預設會把 query parameters 全部截斷！
    if (includeQueryParams) {
        key = url;
    }
    // ...
}
```
由於我們使用了 Next.js Image Proxy 來解決 CORS 問題，所有的圖片網址都長得像這樣：
`/_next/image?url=https%3A%2F%2Fposter1.jpg&w=256&q=75`

當 `includeQueryParams` 預設為 `false` 時，所有圖片網址經過 `replace(/\?.*/, '')` 處理後，**Cache Key 全都被截斷成了 `/_next/image`**！
這導致當第一張圖片（通常是體積最小、載入最快的書本封面）轉換完成並存入 `cache['/_next/image']` 後，後續所有圖片在轉換時，都會「命中」同一個 Cache Key，進而被全部替換成第一張圖片的 Base64 資料。這完美解釋了為何九宮格最終會出現 8 張一模一樣的圖片。

### 修復方案 (The Fix)
解法非常簡單直接，完全不需要去 hack Safari 或牽涉複雜的非同步處理。
我們只需要在呼叫 `toPng` 時，傳入 `includeQueryParams: true` 選項，強迫 `html-to-image` 在建立 Cache Key 時完整保留 `?url=...` 參數即可：

```tsx
await toPng(templateRef.current, {
    // ... other options
    includeQueryParams: true, // 核心修復：阻止 Cache Key 碰撞
});
```

為確保最穩定的體驗，我們同時保留了以下幾項防禦性實作：

### 防護 1: 圖片極致瘦身 (Payload Reduction)
強制透過 `/_next/image?w=384` 壓縮參數，使圖片被 `html-to-image` 轉成 Base64 塞入 Canvas SVG 時盡可能小巧，規避 iOS 的嚴格系統記憶體天花板 (OOM)。

### 防護 2: 防止 Opaque Cache
在 `getImageProps` 統一對所有 Proxy 圖片補上 `crossOrigin="anonymous"`。此舉與同源政策(Same-Origin)無關，而是為避免瀏覽器存下缺乏安全聲明的「不透明快取」，進而在之後引發 Canvas 被 Tainted 拒絕存取。

### 防護 3: 緩解繪圖管線週期延遲 (Double Capture Heuristics)
針對偶發的「第一次點分享會缺圖」現象，這通常是因為主執行緒重繪週期跟不上指令，或者圖片即使下載完畢但尚未送入合成層 (Compositing)。
*   **Warm-up Capture**: 我們會在正式截圖前執行一次廢棄用的 `toPng` 呼叫。主要目的是利用這個強制擷取過程「熱身管線」，強迫推進 Layout/Paint 週期的進行。
*   **延遲與擷取 (Short Delay)**: 等待一段時間 (`setTimeout 800ms`) 讓 GPU 有時間去緩衝及消化圖形資源後，才執行第二次正式截圖。這是一種**機率性 (Heuristic)** 的防護手段，它能極大幅度地逼近 100% 的成功率。
### 8.4 總結：Safari 穩定匯出的黃金清單 (The Safari Checklist)
為確保在 iOS Safari 上 100% 成功產生分享圖片，開發時必須遵循以下開發規範：

1.  **路由重寫 (URL Rewrite)**: 外部圖片必須通過前端 Proxy (如 `/proxy/tmdb/`) 轉為同源請求。
2.  **防範快取污染 (Opaque Cache)**:
    *   **外部網域或 Proxy 圖片** (如 `/_next/image`): 即使是同源代理，都必須加上 `crossOrigin="anonymous"`，確保底層磁碟快取附帶 CORS 標記，避免 Tainted Canvas 報錯。
    *   **本地靜態資源**: 若為直接從 `/public` 拉取的靜態檔案則不需加。
3.  **參數快取碰撞 (Cache Key Collision)**:
    *   **必須將 `includeQueryParams: true` 傳入 `html-to-image` 的選項內**，防止代理網址在產生快取鍵值 (Cache Key) 時被截斷，導致所有分享縮圖變成無腦複製的第一張圖。
4.  **管線預熱 (Double Capture Strategy)**:
    *   可搭配使用 `await img.decode()` 加速素材備便。
    *   透過「熱身擷取再真正擷取」的暖身週期與微幅 Delay，大幅強化圖片準時上到畫布的成功機率。
5.  **降低 OOM 閃退風險**: 匯出節點內**避免疊加不必要的高耗能效果**，例如移除部分會強制觸發 Off-screen Buffer 的 `filter` 及 `backdrop-filter`，保持單純的排版結構。

