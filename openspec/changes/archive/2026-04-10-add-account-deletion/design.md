## Context

為了符合現代隱私權規範並賦予使用者對個人資料的控制權，Storio 需要實作帳號刪除與資料清空的功能。由於這兩項操作具有高度破壞性（一旦執行無法復原），我們需要確保這些功能有適當的「防誤觸機制」，同時在介面設計上不應過度凸顯，避免鼓勵使用者輕易使用。

目前的 Profile 頁面已有多個 Sub-view（如：語言設定、統計設定），我們將延用這個架構，將破壞性操作收納在一個層級較深的設定頁面中。

## Goals / Non-Goals

**Goals:**
1. 提供「徹底刪除帳號」與「僅清空所有館藏資料」兩個選項。
2. 透過強制的文字輸入確認機制 (Confirmation Modal)，確保使用者的意圖是明確的。
3. 實作安全且完整的後端刪除邏輯，確保關聯的資料庫紀錄能被徹底移除。

**Non-Goals:**
1. 提供「資料匯出 (Data Export)」功能（這將在未來的其他 Epic 處理）。
2. 提供「復原 (Undo)」或軟刪除機制。所有操作均為即時且不可逆的硬刪除 (Hard Delete)。

## Decisions

### 1. 前端 UI 與流程 (Frontend UX)
*   **入口名稱與位置**：在 `ProfilePage` 的 `Settings` 區塊中，新增名為 **"Privacy & Safety" (隱私與安全性)** 的入口，點擊後進入專屬的 Sub-view。此名稱符合 App Store 規範，且不會過度吸引一般使用者注意。（需包含中英文多語系支援）。
*   **確認機制**：
    *   點擊「刪除帳號」時，彈出 Modal 警告，要求輸入 `DELETE ACCOUNT`（不區分大小寫）並按確認。
    *   點擊「清空資料」時，彈出 Modal 警告，要求輸入 `CLEAR DATA`（不區分大小寫）並按確認。
*   **執行後狀態**：
    *   刪除帳號成功：清除本地 Token，導回 `/` (Landing Page)。
    *   清空資料成功：顯示 Toast 提示成功，保留在 Profile 頁面（或導回首頁但保持登入狀態）。

### 2. 後端 API 設計 (Backend FastAPI)
新增兩個 Endpoint 處理這些請求：
*   `DELETE /api/v1/users/me`：
    *   驗證 JWT Token 確保身份。
    *   使用 Supabase Admin Client 刪除使用者在 Auth 的帳號 `supabase.auth.admin.delete_user(uid)`。
    *   （需確認資料庫的 Cascade Delete 規則是否完善。如果沒有，後端需負責執行刪除 `profiles`, `collections`, `stories` 等）。
*   `DELETE /api/v1/users/me/data`：
    *   驗證 JWT Token。
    *   執行 SQL 刪除該 User ID 在 `collections` 與 `stories`（若屬於該使用者）的所有資料，但不刪除 Auth 與 Profile。

### 3. 資料庫串聯刪除 (Supabase Cascade Delete)
*   Supabase 的 `auth.users` 刪除時，關聯的 `public.profiles` 必須設定 `ON DELETE CASCADE`。
*   需要檢查並確保 `collections.user_id` 也有 `ON DELETE CASCADE`。
*   這能將後端邏輯簡化為單純的一行 API 呼叫，並讓資料庫層級確保資料完整性。

## Risks / Trade-offs

*   [Risk] **使用者誤刪帳號** → Mitigation: 實作嚴格的二次輸入確認機制 (`DELETE ACCOUNT`)，並在文案上強調不可逆。
*   [Risk] **Supabase Cascade Delete 未觸發導致資料殘留** → Mitigation: 在部署前手動測試資料庫的 Cascade 設定，如果無法確保，則在 FastAPI 中手動執行 DELETE 查詢。
*   [Risk] **iOS 審核被退回** → Mitigation: App Store 嚴格要求帳號刪除必須容易找到。雖然我們放進 Sub-view 中，但這符合「設定 -> 帳號設定 -> 刪除」的常見模式，應該能通過審核。