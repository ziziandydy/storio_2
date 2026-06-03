## Why

目前點擊 Profile 頁面的登出按鈕後直接執行 `signOut()`，無任何確認步驟，容易誤觸。需加入確認 modal 防止意外登出。

## What Changes

- 修改 `client/src/app/profile/page.tsx`：登出按鈕觸發 modal，確認後才執行 `signOut()`
- 修改 `client/src/i18n/locales.ts`：新增 `logout_confirm_title`、`logout_confirm_cta` 字串（zh-TW / en-US）

## Capabilities

### New Capabilities

- `logout-confirmation`：登出確認 modal，樣式與現有 Framer Motion modal 一致（`bg-folio-black border border-white/10 rounded-[32px]`），含 icon、標題、取消/確認雙按鈕，支援 i18n。

### Modified Capabilities

（無）

## Impact

- **前端**：僅 `profile/page.tsx`、`locales.ts`
- **不影響**：`signOut()` 邏輯、router 跳轉、其他頁面
