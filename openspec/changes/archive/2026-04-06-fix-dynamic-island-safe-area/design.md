## Context

iPhone 16 Pro 的動態島（Dynamic Island）高度約 59px，位於螢幕頂部中央。Storio App 以 Capacitor WKWebView 包裝 Next.js PWA，透過 `viewport-fit=cover` 讓內容延伸至全螢幕。CSS 安全區域由 `env(safe-area-inset-top)` 提供，並在 `globals.css` 中封裝為 `--sa-top` CSS Custom Property。

目前問題：部分頁面的固定元素（header 遮罩、Modal 關閉按鈕、Toast）仍使用固定 `top-6`（24px），或在 inline style 直接呼叫 `env(safe-area-inset-top)` 而非 `var(--sa-top)`，導致元素落在動態島區域內。

## Goals / Non-Goals

**Goals:**
- 所有頂部固定元素（遮罩、按鈕、Toast）皆正確顯示於動態島下方
- 統一使用 `var(--sa-top)` CSS variable（而非直接 `env()`）確保在 WKWebView 可靠解析

**Non-Goals:**
- 不修改底部 safe-area 邏輯
- 不重構元件結構，僅修改 CSS class / inline style
- 不影響 Android 或 Web 瀏覽器端顯示

## Decisions

**決策 1：統一使用 `var(--sa-top)` 而非 `env(safe-area-inset-top)` in inline styles**

`env()` 在 React inline style 屬性中的行為在部分 WebView 版本中可能不可靠（解析為 0）。`--sa-top` 已在 `:root` 中定義並確認可在所有頁面取得，inline style 使用 `calc(var(--sa-top) + ...)` 更為穩定。

**決策 2：黑色遮罩 pattern（`h-[var(--sa-top)]` div）**

首頁缺少從 `top-0` 到 header 起始位置的黑色遮罩，捲動時內容穿透至動態島後方可見。採用與 `collection/item/page.tsx` 相同的已驗證 pattern：
```jsx
<div className="fixed top-0 left-0 right-0 h-[var(--sa-top)] bg-folio-black z-[100] pointer-events-none" />
```

**決策 3：Toast / Modal 關閉按鈕改用 `calc(var(--sa-top)+0.5rem)`**

`top-6`（24px）= 動態島高度（~59px）以內 → 改為 `top-[calc(var(--sa-top)+0.5rem)]`，確保始終在動態島下方保留 8px 間距。

## Risks / Trade-offs

- **[Risk] `var(--sa-top)` 在 Web 瀏覽器為 0**：若使用者在普通瀏覽器開啟，`env(safe-area-inset-top)` 通常回傳 0，`calc(0px + 0.5rem)` = 8px → Toast 仍在頁面頂部顯示，視覺上合理，無功能影響。
- **[Risk] 黑色遮罩遮擋非黑色背景頁面**：目前所有頁面背景均為 `bg-folio-black`，無視覺衝突。
- **[Trade-off] 非完全動態**：使用 CSS variable 而非 JavaScript 讀取 `safeAreaInsets`（Capacitor API），但 CSS variable 方案已足夠且維護成本更低。
