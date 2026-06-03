## Why

iOS 真機測試（iPhone 16 Pro）發現多個頁面的動態島（Dynamic Island）區域出現 UI 問題：電影卡片內容從 header 後方露出、Toast 通知被動態島遮擋、Modal 關閉按鈕落在動態島區域內、詳情頁 BACK 按鈕與動態島重疊。這些問題會影響 App Store 審查通過率，必須在 TestFlight 前修復。

## What Changes

- **首頁（`page.tsx`）**：加入固定黑色遮罩覆蓋 `top-0` 至 `top-[var(--sa-top)]`，防止捲動內容從 header 後方穿透動態島區域
- **StoryDetailsView（`StoryDetailsView.tsx`）**：將 header 的 inline style 從 `env(safe-area-inset-top)` 改為 `var(--sa-top)` CSS variable，確保在 WKWebView 中可靠解析
- **Toast 通知（`ToastProvider.tsx`）**：將 `fixed top-6` 改為 `fixed top-[calc(var(--sa-top)+0.5rem)]`，使 Toast 顯示在動態島下方
- **MonthlyRecapModal（`MonthlyRecapModal.tsx`）**：關閉按鈕從 `fixed top-6` 改為 `fixed top-[calc(var(--sa-top)+0.5rem)]`
- **ShareModal（`ShareModal.tsx`）**：關閉按鈕同上修正

## Capabilities

### New Capabilities

- `dynamic-island-safe-area`: 所有頁面與 Modal 的頂部互動元素（按鈕、通知、遮罩）均正確適配 iPhone 動態島安全區域

### Modified Capabilities

<!-- 無 spec-level 行為變更，僅為 CSS 實作修正 -->

## Impact

**受影響檔案：**
- `client/src/app/page.tsx`
- `client/src/components/StoryDetailsView.tsx`
- `client/src/components/ToastProvider.tsx`
- `client/src/components/MonthlyRecapModal.tsx`
- `client/src/components/ShareModal.tsx`

**無 API 變更、無資料庫變更、無邏輯變動。**
純 CSS class / inline style 修正，全為視覺層修復。
