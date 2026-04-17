## Context

目前 iOS App 的 Google 登入使用 `supabase.signInWithOAuth({ provider: 'google' })`，會開啟系統 Safari 完成 OAuth 授權。授權後 App 無法自動取回 session，導致用戶留在 Safari 或需手動切回 App。

現有 Apple Sign-In 已採用 Hybrid 模式（`appleAuth.ts`）：iOS native 走 `@capacitor-community/apple-sign-in` 取得 `identityToken` → `supabase.signInWithIdToken`；web 走 `signInWithOAuth`。Google 登入應建立完全對稱的架構。

## Goals / Non-Goals

**Goals:**
- iOS App Google 登入全程在 App 內完成（native Google 帳號選擇器 sheet）
- 架構與 Apple Sign-In hybrid 模式完全對稱（`googleAuth.ts` 平行於 `appleAuth.ts`）
- Web 端行為不變

**Non-Goals:**
- 不更動 Android 登入行為（目前無 Android build）
- 不修改後端 API 或 Supabase 設定
- 不自動化 Google Cloud Console 設定

## Decisions

**決策 1：使用 `@codetrix-studio/capacitor-google-auth` 而非 `@capacitor/browser` + deep link**

原因：`@codetrix-studio/capacitor-google-auth` 直接呼叫 iOS Google Sign-In SDK，回傳 `idToken`，可直接接 `supabase.signInWithIdToken`，與 Apple Sign-In 模式完全一致。`@capacitor/browser` 方案需設定 Universal Links（AASA 檔），複雜度高且授權流程仍有「切換感」。

**決策 2：`isNativePlatform()` 分支邏輯封裝在 `googleAuth.ts`，不在 component 內**

與 `appleAuth.ts` 一致，component 只呼叫 `nativeGoogleSignIn()`，不感知平台差異。

**決策 3：取消偵測用 message 關鍵字 + error code `12501`**

Google Sign-In SDK 取消時拋出 code `12501` 或含 "cancel"/"dismissed" 的 message，靜默處理不顯示錯誤，與 Apple Sign-In 的 code `1001` 處理邏輯對稱。

## Risks / Trade-offs

- **[風險] Google Cloud Console 手動設定**：iOS OAuth Client ID 需手動建立，`REVERSED_CLIENT_ID` 需填入 Info.plist。→ 緩解：spec 中明確記錄設定步驟，build 前檢查
- **[風險] `@codetrix-studio/capacitor-google-auth` 套件維護狀態**：此為社群維護套件。→ 緩解：版本鎖定，主要邏輯在 `googleAuth.ts` 隔離，未來可替換
- **[Trade-off] Web Client ID 需放入 `capacitor.config.ts`**：`serverClientId` 為 public 設定（前端 bundle 可見），這是 Google Sign-In 的標準做法，不含 secret
