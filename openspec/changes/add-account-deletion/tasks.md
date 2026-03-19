## 1. i18n 多國語系支援

- [x] 1.1 在 `client/src/i18n/locales.ts` 中新增 Privacy & Safety 相關字串（包含標題、描述、按鈕文字、警告文案、確認字串等）。

## 2. 後端 API 實作 (FastAPI)

- [x] 2.1 建立 `server/app/api/v1/endpoints/user.py` 並實作 `DELETE /me` (帳號刪除) 與 `DELETE /me/data` (資料清空) 路由。
- [x] 2.2 在 `server/app/api/api_v1.py` 中註冊新建立的 `user` 路由。
- [x] 2.3 在 `server/app/services/collection_service.py` 中實作 `clear_user_data` 邏輯。
- [x] 2.4 在 `server/app/core/supabase.py` (或相關 core 模組) 確保有支援 Admin Client 權限以刪除 Auth 使用者，並在 `user_service` (若需要新建立) 或 `api` 中調用。

## 3. 前端 UI 實作 (Next.js)

- [x] 3.1 修改 `client/src/app/profile/page.tsx`，在 `Settings` 區塊新增 "Privacy & Safety" 入口項目與對應的 `showPrivacySettings` 狀態。
- [x] 3.2 在 `ProfilePage` 中實作 `Privacy & Safety` 的 Sub-view UI。
- [x] 3.3 建立或擴充一個通用的 `ConfirmationModal` 元件，支援輸入特定字串才能啟用的確認按鈕（CSS 需符合 Storio 美學）。
- [x] 3.4 在 `Privacy & Safety` Sub-view 中實作「清除資料」與「刪除帳號」的點擊邏輯，觸發對應的確認 Modal。
- [x] 3.5 整合 API 呼叫：實作 `handleClearData` 與 `handleDeleteAccount` 函式，並處理成功後的跳轉與狀態清除。

## 4. 驗證與測試

- [ ] 4.1 測試「清除資料」：驗證資料庫中的 `collections` 與 `stories` 紀錄已被移除，但帳號與 Profile 依然存在。
- [ ] 4.2 測試「刪除帳號」：驗證 Supabase Auth 使用者已不存在，且其所有關聯資料已同步清除。
- [ ] 4.3 驗證多語系切換在 Privacy & Safety 頁面與 Modal 中的正確性。