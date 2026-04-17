## ADDED Requirements

### Requirement: iOS 原生 Google 登入不離開 App
在 iOS 原生環境（`Capacitor.isNativePlatform() === true`），點擊 Google 登入時，系統 SHALL 呼叫 native Google Sign-In SDK 顯示帳號選擇器 sheet，在 App 內完成授權，不開啟系統 Safari。

#### Scenario: iOS 用戶成功完成 Google 登入
- **WHEN** iOS App 用戶點擊「繼續使用 Google」
- **THEN** 系統顯示 native Google 帳號選擇器 sheet（不跳出 App）
- **THEN** 用戶選擇帳號後，App 取得 `idToken` 並呼叫 `supabase.signInWithIdToken`
- **THEN** 登入成功，用戶停留在 App 內進入首頁

#### Scenario: iOS 用戶取消 Google 登入
- **WHEN** iOS App 用戶在帳號選擇器 sheet 點擊取消或關閉
- **THEN** 系統靜默關閉 sheet，不顯示錯誤訊息，返回原畫面

### Requirement: Web 端 Google 登入行為不變
在非原生環境（`Capacitor.isNativePlatform() === false`），Google 登入 SHALL 維持原有 `supabase.signInWithOAuth` OAuth redirect 流程。

#### Scenario: Web 用戶點擊 Google 登入
- **WHEN** Web 用戶點擊「繼續使用 Google」
- **THEN** 系統呼叫 `supabase.signInWithOAuth({ provider: 'google' })`，行為與現有相同

### Requirement: Google Sign-In 錯誤處理
`nativeGoogleSignIn()` SHALL 回傳 `{ error, cancelled }` 結構，與 `nativeAppleSignIn()` 介面一致。

#### Scenario: Google SDK 回傳錯誤（非取消）
- **WHEN** `GoogleAuth.signIn()` 拋出非取消性質的錯誤
- **THEN** `nativeGoogleSignIn()` 回傳 `{ error: Error, cancelled: false }`
- **THEN** 呼叫端顯示適當的錯誤提示

#### Scenario: Google Sign-In 未回傳 idToken
- **WHEN** `GoogleAuth.signIn()` 成功但 `authentication.idToken` 為空
- **THEN** `nativeGoogleSignIn()` 回傳 `{ error: new Error('No idToken returned'), cancelled: false }`
