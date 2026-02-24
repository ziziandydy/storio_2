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
    *   移除本地 Logo圖片的 `crossOrigin="anonymous"` 屬性。
    *   已將 Logo 轉為 Base64 字串 (`LOGO_BASE64`) 直接嵌入 Component，徹底解決 Safari (尤其是 iOS) 掛載本地圖片時產生的 Tainted Canvas 錯誤。 
*   **Poster 處理**:
    *   外部或 Proxy 圖檔 (`http` 或 `/proxy` 開頭) 仍必須加上 `crossOrigin="anonymous"`。
    *   已於 `getImageProps` 函數加入條件判斷。

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
