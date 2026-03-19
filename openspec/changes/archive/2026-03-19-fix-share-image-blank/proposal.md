# Revised Proposal: Fix Share Image Blank Issue in iOS/Safari Environment

## 1. Problem Description
在目前的 Production 環境中（特別是 iOS 實機上的 Capacitor app 或 Safari），使用者透過 `ShareModal` 或 `MonthlyRecapModal` 嘗試分享時，匯出的圖片常常發生「背景消失」、「海報空白」或是完全無法生成並報錯 (Tainted Canvas) 的狀況，這導致分享功能在 iOS 上極度不穩定。

## 2. Root Cause Analysis (Critique-Driven)

根據最新的程式碼與您的精準分析，先前的方向確實有誤。真正的問題如下：

### 2.1 🔴 致命缺陷：未經代理的外部 CSS 背景圖片 (The Unsplash Issue)
*   **現象**：在 3D 書櫃 (`3d`) 與部分可能使用外部圖片作為背景的模板中，匯出時經常因為 Tainted Canvas 崩潰。
*   **根因**：
    在 `MemoryCardTemplate.tsx` 的 3D 模板中，直接使用了外部 Unsplash 圖片作為 `backgroundImage`:
    ```tsx
    backgroundImage: `url('https://images.unsplash.com/photo-1481627834876...')`
    ```
    這產生了三個致命問題：
    1.  **完全繞過 Proxy**：它沒有經過 `image-utils.ts` 的 Proxy 處理，直接向外部 CDN 發起請求。
    2.  **`html-to-image` 的 XHR 缺陷**：`html-to-image` 在處理 `background-image: url(...)` 時，會嘗試透過 `fetch` 或 `XMLHttpRequest` 去抓取該圖片並轉為 Base64。但因為 Unsplash 圖片沒有明確的 CORS 允許，這會直接觸發 Tainted Canvas 錯誤並中斷整個渲染流程。
    3.  **`waitForAllImages` 盲區**：我們為了穩定性實作的 `waitForAllImages` 函數只能抓到 `<img />` 標籤，根本無法確保這張 CSS 背景圖載入完成。

### 2.2 ⚠️ 潛在的 CORS 設定衝突 (Backend CORS Middleware)
*   **現象**：雖然圖片經過了自建的 Proxy `/api/v1/proxy/image`，但還是偶爾會因為 CORS 失敗。
*   **根因**：
    在後端的 `proxy.py` 中，我們手動設定了回傳標頭：
    `"Access-Control-Allow-Origin": "*"`
    但是，在 `main.py` 的全域 `CORSMiddleware` 中，卻又設定了：
    `allow_credentials=True`
    **依據 W3C CORS 規範，`Access-Control-Allow-Origin: *` 絕對不能與 `Access-Control-Allow-Credentials: true` 同時出現。** 這在某些嚴格的瀏覽器（如 Safari）中會導致 CORS 預檢或實際請求被強制阻擋，使得 Proxy 圖片本身就載入失敗。

### 2.3 修正認知：UI Bug 與 `isProxyUrl` 死碼
*   **關於 UI Disabled**：先前認為 `ShareModal` 的按鈕被 `isSingleItem` 鎖死，經查證目前程式碼中已是正確的 `disabled={isGenerating}`，這部分無需修復。
*   **關於 `isProxyUrl`**：先前認為 `/proxy/` 開頭的 URL 沒有加上 `crossOrigin="anonymous"` 是造成 Opaque Cache 的原因。但實際上 `image-utils.ts` 回傳的是 `https://.../api/v1/proxy/image?url=...` 絕對路徑，因此 `isProxyUrl` 判斷根本不會成立。所有的 Proxy 圖片**其實都已經正確掛上了 `crossOrigin="anonymous"`**。

## 3. Proposed Solutions

針對以上真正的 Root Causes，提出以下解決方案：

### 3.1 徹底消滅外部 CSS `background-image`
*   **行動**：修改 `client/src/components/share/MemoryCardTemplate.tsx` 中 3D 模板的 Unsplash 背景。
*   **實作**：將該背景圖下載下來並放入本地端 `/client/public/image/share/library_bg.jpg`。
*   **套用**：改用標準的 `<img>` 標籤配合 `absolute inset-0 object-cover` 來排版（或是透過 `getImageProps` 轉換為經過 Proxy 或本地安全的 URL），確保它受到 `waitForAllImages` 的監控並安全地被 `html-to-image` 渲染。

### 3.2 修復後端 Proxy 的 CORS 衝突
*   **行動**：修改 `server/app/api/v1/endpoints/proxy.py`。
*   **實作**：既然 `main.py` 的 `CORSMiddleware` 已經負責處理基於白名單的 Origin 映射與 Credentials，我們在 `proxy.py` 的手動 Response Headers 中應該**移除** `Access-Control-Allow-Origin: "*"`，把 CORS 的控制權完全交還給全域的 Middleware，避免規範衝突。

### 3.3 強化 `waitForAllImages` (防禦性升級)
*   雖然移除了 CSS背景圖，但為了確保 `ShareModal` 與 `MonthlyRecapModal` 裡的 `html-to-image` 擷取絕對穩定，我們將重新檢視並確保所有模板內的圖片（包含 `MemoryCardTemplate` 和 `MonthlyRecapTemplate`）都使用 `<img />` 而非 `background-image` 載入外部/Proxy圖片。

## 4. Debug 機制設計

在執行任何修復之前，先在關鍵環節埋入結構化的 Debug log，讓問題在真機（Xcode Console / Safari Remote Debug）上可被精確定位。

### 4.1 Debug 埋點位置與目標

**環節 1：`proxiedItem` 生成後（ShareModal.tsx）**
- 目標：確認 URL 格式正確（絕對路徑、含 `_t` 與 `salt` 參數、無重複 encode）
- Log 內容：原始 `posterPath` → 轉換後的 proxy URL

**環節 2：`waitForAllImages` 每張圖（ShareModal.tsx）**
- 目標：確認每張圖確實載入完成，且 `crossOrigin` attribute 正確掛上
- 現有 log 不足：目前只記錄 `decode()` 結果，缺少 `img.naturalWidth`、`img.crossOrigin` 的驗證
- Log 內容：`{ src, complete, naturalWidth, crossOrigin, decodeResult }`

**環節 3：暖機 Capture 結束後（ShareModal.tsx）**
- 目標：判斷暖機是否真的有效（空白圖 vs 正常圖）
- Log 內容：`warmUpDataUrl.length`，若 `< 1000` 視為空白並警告

**環節 4：正式 Capture 結束後（ShareModal.tsx）**
- 目標：判斷最終截圖是否為有效 PNG
- Log 內容：`finalDataUrl.length`、`finalDataUrl.substring(0, 50)`（確認 base64 PNG header）

**環節 5：Capacitor `Filesystem.writeFile` 後（ShareModal.tsx）**
- 目標：確認檔案確實寫入磁碟，URI 格式正確
- Log 內容：`savedFile.uri`（應為 `file://` 開頭的絕對路徑）

**環節 6：`Share.share` 呼叫結果（ShareModal.tsx）**
- 目標：確認原生分享表單是否正常彈出，或是 throw
- Log 內容：成功訊息 or catch 到的 error 物件

**環節 7：後端 Proxy 回應（proxy.py）**
- 目標：確認 CORS Header 在移除 `*` 後是否仍由 CORSMiddleware 正確補上
- Log 內容：印出 request 的 `Origin` Header 與最終回應的 `Access-Control-Allow-Origin`

### 4.2 空白圖自動偵測邏輯

在 `handleCapture` 中加入 dataUrl 有效性判斷：

```
dataUrl.length < 5000  → 視為空白圖，記錄 WARN 並回傳 null
dataUrl 不以 "data:image/png;base64," 開頭 → 視為格式錯誤，記錄 ERROR
```

這樣 `handleShare` / `handleDownload` 在收到 `null` 時可以顯示明確的錯誤提示，而非靜默失敗。

### 4.3 Debug 模式開關

為避免 Production log 爆量，所有新增的 Debug log 統一透過一個常數控制：

```tsx
const SHARE_DEBUG = process.env.NODE_ENV === 'development' ||
                    process.env.NEXT_PUBLIC_SHARE_DEBUG === 'true';
```

真機測試時可在 `.env.local` 設定 `NEXT_PUBLIC_SHARE_DEBUG=true` 開啟。

---

## 5. Execution Plan

> **原則**：先埋 Debug，再修復，再驗證。確保每次測試都有 log 可查。

1. **Debug 埋點**：依照第 4 節，在 `ShareModal.tsx` 與 `proxy.py` 加入結構化 log 與空白圖偵測邏輯。
2. **Backend**：修改 `server/app/api/v1/endpoints/proxy.py`，移除衝突的 `Access-Control-Allow-Origin: *` Header，確認 CORSMiddleware 能正確接手（搭配環節 7 的 log 驗證）。
3. **Asset**：下載 Unsplash 圖片至本地 `client/public/image/share/library_bg.jpg`。
4. **Frontend**：修改 `client/src/components/share/MemoryCardTemplate.tsx`，將 `3d` 模板的 CSS 背景替換為本地 `<img />`，並統一使用 `getImageProps`。
5. **真機 UAT**：在 iPhone 實機（非 Simulator）上分別測試所有模板的分享與下載，對照 Xcode Console 的 log 確認各環節狀態。
6. **後續評估**：若 UAT 後仍有特定環節持續失敗，依 log 結果決定是否啟動後端產圖保底方案。

### 已知限制（不在此 Change 修復範圍）

- **`3d` 模板的 CSS 3D 渲染**：`html-to-image` 不支援 `preserve-3d` / `backfaceVisibility`，截圖結果視覺上會失真，為既知限制。
- **`backdrop-blur` 效果消失**：`html-to-image` 不支援 `backdrop-filter: blur()`，毛玻璃效果在截圖中不顯示，為既知視覺差異。