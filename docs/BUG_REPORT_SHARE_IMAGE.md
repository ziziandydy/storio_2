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

### 3.2 修正 `MemoryCardTemplate.tsx` 的圖片標籤
*   **Logo 處理**: 
    *   移除本地 Logo圖片的 `crossOrigin="anonymous"` 屬性 (因為它是同源的，不需要 CORS 檢查，加上反而可能被 Safari 阻擋)。
    *   或是將 Logo 轉為 Base64 字串直接嵌入，一勞永逸解決加載問題。
*   **Poster 處理**:
    *   維持 `crossOrigin="anonymous"`。
    *   在 `ShareModal` 中預先將海報轉為 **Base64** (目前已實作，需確認是否生效)。

### 3.3 CSS 屬性調整
*   **Backdrop Filter**: 在生成圖片時，`html-to-image` 可能無法抓取 `backdrop-filter`。
    *   **解法**: 改用絕對定位的 `<img>` 加上 `filter: blur(...)` 來模擬背景模糊，而非依賴 CSS `backdrop-filter`。目前 Default Template 已採用此法 (`object-cover blur-[50px]`)，需檢查是否因 `scale-110` 超出容器而被裁切掉。

## 4. 具體修復步驟 (Action Items)

1.  **[Critical] Logo Base64 化**: 將 `logo.png` 轉為 Base64 string 常數放入代碼中，確保 Logo 永遠顯示。
2.  **[Critical] 調整 `html-to-image` 選項**:
    ```typescript
    const dataUrl = await toPng(templateRef.current, {
      cacheBust: true,
      pixelRatio: window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio, // 限制最大倍率
      backgroundColor: '#0d0d0d',
      skipAutoScale: true,
      style: {
        transform: 'scale(1)', // 強制重置 transform 避免偏移
      }
    });
    ```
3.  **[Fix] 移除本地圖片 CORS**: 在 `MemoryCardTemplate` 中，針對 `/image/logo/...` 的圖片移除 `crossOrigin` 屬性。

```tsx
// Before
<img src="/image/logo/logo.png" crossOrigin="anonymous" ... />

// After (Local Asset)
<img src="/image/logo/logo.png" ... /> 
// 或者更好：使用 Base64
```
