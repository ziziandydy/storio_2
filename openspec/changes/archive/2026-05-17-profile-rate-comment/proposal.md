## Why

Profile 頁面 Community section 的「為我們評分」按鈕目前是死按鈕（無 onClick），無法導向 App Store，且缺乏「書面評論」入口，讓使用者無法用簡單方式為 App 留下評分與文字評論。

## What Changes

- **「為我們評分」按鈕啟用**：點擊後透過 App Store deeplink 開啟 App 頁面，讓使用者評星
- **新增「留下評論」按鈕**：新增於 Community section，透過 `?action=write-review` 直跳 App Store 書面評論輸入框
- 兩個功能均支援 iOS native（`itms-apps://` scheme）與 Web（`https://apps.apple.com/` URL）fallback

## Capabilities

### New Capabilities

- `app-store-rating`: Profile Community section 的 App Store 評分與書面評論 deeplink 功能

### Modified Capabilities

（無現有 spec 需要修改需求）

## Impact

- **前端**：`client/src/app/profile/page.tsx`（新增 handler、更新 Community section）
- **i18n**：`client/src/i18n/locales.ts`（新增 `commentApp` 翻譯 key）
- **後端**：無變動
- **依賴**：無新套件，使用現有 `isNativePlatform()` from `@/lib/appleAuth`
