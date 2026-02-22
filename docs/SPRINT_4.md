# SPRINT 4: Social Sharing & Identity

**目標**: 透過精美的分享功能提升產品擴散力，並透過 OAuth 整合建立真實的用戶身份系統。
**週期**: 2026-02-23 ~ TBD

---

## 1. 功能規格 (Specifications)

### 1.1 Identity & Authentication (優先實作)
*   **Supabase OAuth Integration**:
    *   **Provider**: Google, Apple.
    *   **流程**: 點擊按鈕 -> `signInWithOAuth` -> 瀏覽器轉址 -> Callback -> 建立 Session。
*   **Email OTP (Magic Code)**:
    *   **功能**: 允許使用者輸入 Email，收到 6 位數驗證碼後登入 (取代純密碼，更安全且無需記憶)。
    *   **UI**: 
        *   在 `OnboardingModal` 中增加 "Continue with Email" 選項。
        *   點擊後切換至 Email 輸入框。
        *   輸入後顯示 6 格 OTP 輸入框 (Input OTP)。
    *   **流程**: 
        1. 輸入 Email -> `signInWithOtp({ email })`.
        2. 輸入 Code -> `verifyOtp({ email, token, type: 'email'})`.

### 1.2 Memory Card Sharing (單一作品分享)
*   **功能描述**: 將單一收藏作品轉化為一張精美的直立式卡片 (Instagram Story 比例 9:16)。
*   **觸發點**: 
    *   詳情頁 (`/collection/[id]`) 的 "Share" 按鈕 (需重新加入或整合至 Personal Archive 區塊)。
    *   分享按鈕點擊後，彈出預覽 Modal，確認後下載圖片。
*   **視覺設計**:
    *   **背景**: 使用海報的高斯模糊 (Blur) 或 Folio Black 漸層。
    *   **核心元素**: 
        *   海報 (Poster) - 具備陰影與圓角。
        *   評分 (Rating) - 金色星星與分數。
        *   心得 (Reflection) - 引用樣式，若無心得則顯示 "A Memory Preserved"。
        *   Logo - 底部置中 Storio Logo。
        *   QR Code (Optional) - 連結回該作品的 Storio 頁面 (Deep link)。
*   **技術實現**: 
    *   使用 `html-to-image` 在客戶端生成圖片 (PNG)。
    *   優點：支援多語系字體，無需伺服器運算，隱私性高。

### 1.2 Monthly Calendar Recap (月度回顧分享)
*   **功能描述**: 在行事曆視圖中，生成該月份的「閱聽總結」圖片 (Instagram Post 比例 1:1 或 4:5)。
*   **觸發點**: Calendar View 標題旁的 "Share" 圖示。
*   **視覺設計**:
    *   **標題**: "February 2026 in Storio"。
    *   **佈局**: 網格狀排列該月看過的海報 (Bento Grid 縮小版)。
    *   **統計**: 顯示 "5 Movies, 2 Books"。
*   **技術實現**: 同樣使用 `html-to-image`，需處理跨域圖片 (CORS) 問題 (通常需設定 Next.js Image Proxy)。

### 1.3 Supabase OAuth Integration
*   **功能描述**: 取代目前的假按鈕，實作真實的 Google 與 Apple 登入。
*   **流程**:
    *   點擊 "Continue with Google" -> 導向 Google OAuth -> 回調 `/auth/callback` -> 建立/登入 User -> 同步 Profile。
    *   **資料遷移 (進階)**: 若使用者先以 Guest (Anonymous) 使用，登入後需嘗試將 Guest 資料合併至正式帳號 (需後端 `transfer_anonymous_data` 邏輯)。
*   **設定**:
    *   Google: 設定 Client ID / Secret。
    *   Apple: 設定 Service ID / Key (需 Apple Developer Account)。
    *   Supabase: 啟用 Auth Providers 並設定 Redirect URL。

---

## 2. 技術任務清單 (Technical Tasks)

### Frontend (Client)
- [ ] **Install Deps**: `pnpm add html-to-image downloadjs`
- [ ] **Component**: 建立 `ShareModal` (通用元件，支援預覽)。
- [ ] **Component**: 建立 `MemoryCardTemplate` (用於生成圖片的隱藏 DOM)。
- [ ] **Component**: 建立 `MonthRecapTemplate` (用於生成月曆圖片的隱藏 DOM)。
- [ ] **Page**: 在 `CollectionDetailPage` 加入分享觸發邏輯。
- [ ] **View**: 在 `CalendarView` 加入分享觸發邏輯。
- [ ] **Auth**: 修改 `OnboardingModal` 的 `handleLogin`，串接 `supabase.auth.signInWithOAuth`。

### Backend (Server)
- [ ] **API**: (Optional) 建立 `/api/v1/auth/merge` 用於合併訪客資料 (若需要)。
- [ ] **Config**: 確認 Supabase 專案設定允許 OAuth Redirect。

---

## 3. 驗收標準 (Acceptance Criteria)
1.  **Share**: 點擊分享能成功下載一張 PNG 圖片，且圖片中無破圖、字體正確。
2.  **Auth**: 點擊 Google 登入能成功跳轉並返回，且 `useAuth` hook 能抓到正確的 `user.email`。
