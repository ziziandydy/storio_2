## Why

為了符合現代 App 的隱私權規範與使用者資料自主權（例如 App Store 審核指南要求），Storio 需要提供使用者自行刪除帳號以及重置/清除資料的功能。這些功能能讓使用者安全且明確地管理他們在系統中的個人資料與館藏紀錄。

## What Changes

- 在 `ProfilePage` 的最底部（或 Account 區塊內）新增一個低優先級的入口：「進階設定 (Advanced)」或「資料管理 (Data Management)」。
- 點擊後進入一個全新的 Sub-view（類似目前的語言或聯絡我們設定頁面），以隱藏破壞性操作，避免鼓勵使用者頻繁使用或誤觸。
- 在這個 Sub-view 中提供兩個選項：
  1. **清除所有資料 (Clear Data)**：清空使用者的所有館藏與心得，但保留帳號。
  2. **刪除帳號 (Delete Account)**：徹底刪除帳號與所有關聯資料。
- **防誤觸機制**：點擊這兩個操作都會彈出警告 Modal。為了確保使用者清楚自己在做什麼，必須在 Modal 中輸入特定的確認字串：
  - 刪除帳號需輸入：「**DELETE ACCOUNT**」
  - 清除資料需輸入：「**CLEAR DATA**」
- 執行刪除動作將會呼叫後端 API，清除 Supabase 中的相應資料。刪除帳號成功後將使用者登出並導向首頁。

## Capabilities

### New Capabilities
- `account-deletion`: 處理使用者帳號刪除與資料重置的完整流程，包含前端的防誤觸確認機制 (Confirmation Modal)，以及後端清除使用者所有相關資料的 API 與資料庫操作。

### Modified Capabilities
- `user-profile`: 修改 Profile 頁面的 UI 結構，新增一個隱藏破壞性操作的「進階設定 (Advanced)」Sub-view 入口。

## Impact

- **Frontend**: 
  - `client/src/app/profile/page.tsx` (新增 Advanced Sub-view 與對應的狀態 `showAdvancedSettings`)
  - 實作或擴充 `ConfirmationModal` 元件，以支援輸入驗證字串的邏輯。
  - 新增呼叫清除資料與刪除帳號 API 的邏輯。
- **Backend (FastAPI)**:
  - 新增 `DELETE /api/v1/users/me` API 以處理帳號刪除。
  - 新增 `DELETE /api/v1/users/me/data` API 以處理資料清空（只刪除 Collections, Stories, 但保留 Profile/User）。
- **Database (Supabase)**:
  - 確保刪除資料時能正確清空對應的紀錄。
  - 帳號刪除需確認是否有正確的串聯刪除 (Cascade Delete) 或手動清理邏輯。