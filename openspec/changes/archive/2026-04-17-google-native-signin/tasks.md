## 1. 環境準備

- [x] 1.1 執行 `cd client && npm install @codetrix-studio/capacitor-google-auth`
- [x] 1.2 在 Google Cloud Console 建立 iOS OAuth 2.0 Client ID（Bundle ID: `com.storio.app`），取得 `CLIENT_ID` 與 `REVERSED_CLIENT_ID`
- [x] 1.3 在 Google Cloud Console 確認 Web OAuth Client ID（`serverClientId` 用）

## 2. iOS 設定

- [x] 2.1 在 `client/ios/App/App/Info.plist` 的 `CFBundleURLTypes` 加入 `REVERSED_CLIENT_ID` URL Scheme
- [x] 2.2 在 `client/capacitor.config.ts` 的 `plugins` 加入 `GoogleAuth`（從環境變數 `GOOGLE_WEB_CLIENT_ID` 讀取）
- [x] 2.3 執行 `npx cap sync ios` 同步插件至 Xcode

## 3. 核心邏輯

- [x] 3.1 新增 `client/src/lib/googleAuth.ts`：實作 `isNativePlatform()`、`isGoogleCancelError()`、`nativeGoogleSignIn()`（回傳 `{ error, cancelled }`）
- [x] 3.2 確認 `nativeGoogleSignIn()` 介面與 `nativeAppleSignIn()` 對稱（相同回傳型別）

## 4. 元件整合

- [x] 4.1 修改 `client/src/app/profile/page.tsx` 的 `handleLogin('google')`：`isNativePlatform()` 為 true 時呼叫 `nativeGoogleSignIn()`，false 時維持 `signInWithOAuth`
- [x] 4.2 修改 `client/src/components/OnboardingModal.tsx` 的 `handleLogin('google')`：同上分支邏輯

## 5. 驗收測試

- [x] 5.1 iOS TestFlight / Simulator：點擊 Google 登入 → 出現 native 帳號選擇器 sheet（不跳出 App）
- [x] 5.2 選擇帳號完成授權 → App 進入首頁，Supabase user 正確建立
- [x] 5.3 取消帳號選擇 → 靜默返回，無錯誤訊息
- [x] 5.4 Web 端 Google 登入 → 行為與修改前相同（OAuth redirect 正常）
