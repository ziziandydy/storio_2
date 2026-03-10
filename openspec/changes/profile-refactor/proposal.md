## Why

目前 Profile 頁面包含了未開發完成的功能（如通知與進階安全性），這會造成使用者的困惑。同時，目前的「聯絡我們」、「功能建議」與「回報問題」散落在列表各處，不夠收斂。我們需要簡化介面，移除暫不需要的元素，並導入一致的子頁面 (Sub-view) 模式來優化「聯絡我們」的使用體驗，透過系統原生郵件輔助使用者提供帶有格式的回饋。

## What Changes

- **移除未完成功能**：從 Profile 頁面暫時隱藏「安全性與隱私 (Security & Privacy)」與「通知 (Notifications)」選項。
- **收斂回饋管道**：將「功能建議」與「回報問題」從主選單移除。
- **重構聯絡我們 (Contact Us) 體驗**：
  - 點擊「聯絡我們」後，透過與「語言 (Language)」設定一致的 Sub-view (次級頁面) 呈現選項。
  - 選項包含：功能建議、回報問題、其他。
  - 點擊後喚起原生 Email (`mailto:andismtu@gmail.com`)。
  - Email 標題自動帶入多國語系前綴與使用者名稱，例如：`[Storio 功能建議] from {username}`。
- **多國語系擴充**：於 `locales.ts` 補齊上述聯絡表單所需的翻譯與前綴詞。

## Capabilities

### New Capabilities
- `contact-us-subview`: 管理 Profile 頁面中的聯絡我們次級頁面與系統郵件喚起邏輯。

### Modified Capabilities
- `profile-settings`: 變更個人檔案設定頁面的選項結構與狀態管理，移除通知與安全隱私項目。

## Impact

- `client/src/app/profile/page.tsx`: 修改主畫面選單，新增 `showContactSettings` 狀態，並實作 Sub-view UI 與 `handleContactSelect` 邏輯。
- `client/src/hooks/useTranslation.ts` & `client/src/i18n/locales.ts`: 新增用於 Email 標題動態組合的語系資源。
- 使用者目前無法再切換推播通知的本地狀態 (對現有功能無實質影響，因推播尚未實作)。