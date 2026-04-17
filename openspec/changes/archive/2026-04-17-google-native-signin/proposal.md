## Why

iOS App 點擊「繼續使用 Google」會跳出 App 開啟系統 Safari 完成授權，授權後無法自動回到 App 內。Google 登入為高頻使用功能，此問題嚴重影響使用流程的流暢度與用戶留存。

## What Changes

- 新增 `client/src/lib/googleAuth.ts`：封裝 native Google Sign-In 邏輯，使用 `@codetrix-studio/capacitor-google-auth` 插件
- 修改 `client/src/app/profile/page.tsx` 與 `client/src/components/OnboardingModal.tsx`：`handleLogin('google')` 改走 native/web hybrid 分支
- 修改 `client/capacitor.config.ts`：加入 GoogleAuth 插件設定
- 修改 `client/ios/App/App/Info.plist`：加入 `REVERSED_CLIENT_ID` URL Scheme

## Capabilities

### New Capabilities

- `google-native-signin`：iOS 原生 Google Sign-In，透過 `@codetrix-studio/capacitor-google-auth` 呼叫 native Google 帳號選擇器 sheet，取得 `idToken` 後呼叫 `supabase.signInWithIdToken`。架構與現有 Apple Sign-In hybrid 模式完全對稱。Web 端保持 `signInWithOAuth` 不動。

### Modified Capabilities

（無既有 spec 層級的行為變更）

## Impact

- **前端**：`profile/page.tsx`、`OnboardingModal.tsx`、`capacitor.config.ts`、`Info.plist`
- **新增依賴**：`@codetrix-studio/capacitor-google-auth`（npm + Capacitor plugin）
- **Google Cloud Console**：需手動建立 iOS OAuth 2.0 Client ID（Bundle ID: `com.storio.app`）
- **不影響**：Web 端登入流程、Apple Sign-In、後端 API、Supabase 設定
