## 1. 首頁頂部安全區域遮罩

- [x] 1.1 在 `client/src/app/page.tsx` JSX 最頂層加入黑色遮罩 div：`<div className="fixed top-0 left-0 right-0 h-[var(--sa-top)] bg-folio-black z-[100] pointer-events-none" />`

## 2. StoryDetailsView BACK 按鈕

- [x] 2.1 在 `client/src/components/StoryDetailsView.tsx` 第 80 行，將 header inline style 從 `calc(env(safe-area-inset-top) + 1.5rem)` 改為 `calc(var(--sa-top) + 1.5rem)`

## 3. Toast 通知位置

- [x] 3.1 在 `client/src/components/ToastProvider.tsx` 第 37 行，將容器 class 從 `fixed top-6` 改為 `fixed top-[calc(var(--sa-top)+0.5rem)]`

## 4. MonthlyRecapModal 關閉按鈕

- [x] 4.1 在 `client/src/components/MonthlyRecapModal.tsx` 第 268 行，將關閉按鈕 class 從 `fixed top-6 right-6` 改為 `fixed top-[calc(var(--sa-top)+0.5rem)] right-6`

## 5. ShareModal 關閉按鈕

- [x] 5.1 在 `client/src/components/ShareModal.tsx`，找到關閉按鈕 `fixed top-6 right-6`，改為 `fixed top-[calc(var(--sa-top)+0.5rem)] right-6`

## 6. 驗證

- [x] 6.1 執行 `npm run build` 確認無編譯錯誤
- [ ] 6.2 執行 `cap sync ios` 並在 iPhone 16 Pro 真機或 Simulator 驗證所有 5 個修正點
