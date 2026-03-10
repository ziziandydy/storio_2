# OpenSpec: Profile Page Contact & Privacy Refactor

## Background & Objective
使用者要求微調 `/profile` 頁面：
1. **移除 (隱藏)**：「安全與隱私 (Security)」選項。
2. **隱藏**：「通知 (Notifications)」設定，待日後開發完成後再重現。
3. **重構「聯絡我們 (Contact Us)」**：
   - 將原本獨立的「功能建議 (Suggest Feature)」與「回報問題 (Report Bug)」整合進「聯絡我們」中。
   - 當使用者點擊「聯絡我們」時，應**參考現有「統計數據 (Statistics) 或語言 (Language)」的 UX，切換進入次級頁面 (Sub-view) 的列表供使用者選擇**。
   - 列表選項：
     1. 功能建議 (Feature Request)
     2. 回報問題 (Bug Report)
     3. 其他 (Other)
   - 選擇後，會開啟系統預設的 Email 客戶端 (透過 `mailto:andismtu@gmail.com`)，並且標題 (Subject) 需帶有多國語言的特定 Prefix 以及目前使用者的名稱。例如：`[Storio 功能建議] from {username}`。

## Scope
- `client/src/app/profile/page.tsx`: 修改 UI 結構與實作 Contact Sub-view。
- `client/src/hooks/useTranslation.ts`: 新增或調整選項的語系字串與 Email 標題前綴。

## Proposed Changes
1. **Remove Security & Privacy**:
   - 在 `ProfileSection (Account)` 區塊中，移除 `<ProfileItem icon={<Shield size={18} />} label={t.profile.items.security} />`。
2. **Hide Notifications**:
   - 在 `ProfileSection (Settings)` 區塊中，移除 Notifications 的 `<ProfileItem />`。
3. **Implement Contact Sub-view**:
   - 移除獨立的 `suggest` 與 `bug` 項目。
   - 在 `ProfilePage` 中新增一個狀態 `showContactSettings` (boolean)。
   - 當點擊「聯絡我們」時，設定 `showContactSettings = true`。
   - 參考 `showLanguageSettings` 的寫法，在 `if (showContactSettings)` 區塊內 return 一個全螢幕的次級頁面，帶有返回按鈕與三個選項的列表。
   - 選單採用 `<button>` 呈現，點擊觸發寄信邏輯。
4. **`handleContactSelect(type)` 邏輯**:
   - 透過 `t.profile.contact.prefix[type]` 獲取多國語言標題前綴。
   - 組裝 email Subject：`[Storio ${localizedPrefix}] from ${displayName}`。
   - 執行 `window.location.href = mailto:andismtu@gmail.com?subject=${encodeURIComponent(subject)}`。
   - 不強制關閉次級頁面 (或視情況返回)，讓使用者能看到觸發了郵件。