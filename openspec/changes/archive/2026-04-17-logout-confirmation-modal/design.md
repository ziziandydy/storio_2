## Context

Profile 頁面登出按鈕直接綁定 `handleSignOut()`（`signOut()` + `router.push('/')`）。現有 modal 使用 Framer Motion `AnimatePresence` + `motion.div`，backdrop `bg-black/95 backdrop-blur-xl`，卡片 `rounded-[32px]`，進場動畫 `scale 0.9→1 + y 20→0`（見 `GuestLimitModal.tsx`）。

## Goals / Non-Goals

**Goals:**
- 點擊登出 → modal 確認 → 才執行登出
- 樣式與現有 modal 完全一致
- i18n 支援 zh-TW / en-US

**Non-Goals:**
- 不建立獨立元件（僅 profile 一個使用點，inline JSX）
- 不更動 `signOut()` 邏輯本身

## Decisions

**決策：inline JSX 而非獨立元件**

只有 `profile/page.tsx` 一個使用點，建立獨立元件是過早抽象。未來若其他頁面也需要類似確認 modal，再提取。

**Modal 不包含說明文字**

只需 icon + 標題 + 雙按鈕，不加「資料已同步」等說明，保持精簡。

## Risks / Trade-offs

- 無顯著風險，改動範圍極小
