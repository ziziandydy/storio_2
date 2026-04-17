# Design Spec: Google Native Sign-In (Capacitor iOS)

**Date:** 2026-04-17
**Status:** Approved
**Context:** 目前 iOS App 點擊「繼續使用 Google」會跳出 App 開啟系統 Safari 完成授權，授權後無法自動回到 App。使用頻率高，需以原生方案修復。

---

## 目標

iOS 原生使用 `@codetrix-studio/capacitor-google-auth` 插件，呼叫 Google 原生帳號選擇器 sheet 完成授權，取得 `idToken` 後透過 `supabase.signInWithIdToken` 登入。與現有 Apple Sign-In Hybrid 模式架構完全對稱。Web 端行為不變。

---

## 架構

```
iOS (native)
  isNativePlatform() → true
    → @codetrix-studio/capacitor-google-auth
    → GoogleAuth.signIn() → { authentication: { idToken } }
    → supabase.signInWithIdToken({ provider: 'google', token: idToken })

Web (browser)
  isNativePlatform() → false
    → supabase.signInWithOAuth({ provider: 'google' })  ← 不動
```

`appleAuth.ts` 已有 `isNativePlatform()` — Google 邏輯建立平行的 `googleAuth.ts`，profile 與 onboarding 的 `handleGoogleLogin` 改呼叫此 lib。

---

## 需修改的檔案

1. **新增 `client/src/lib/googleAuth.ts`** — native Google Sign-In 邏輯封裝
2. **修改 `client/src/app/profile/page.tsx`** — `handleLogin('google')` 路徑
3. **修改 `client/src/components/OnboardingModal.tsx`** — `handleLogin('google')` 路徑
4. **修改 `client/ios/App/App/Info.plist`** — 加入 `REVERSED_CLIENT_ID` URL Scheme
5. **修改 `client/capacitor.config.ts`** — GoogleAuth 插件設定

---

## Google Cloud Console 設定（手動，非程式碼）

需在 Google Cloud Console 建立：
- **iOS OAuth 2.0 Client ID**：Bundle ID `com.storio.app`
- 取得 `CLIENT_ID`（形如 `xxxxxxxx.apps.googleusercontent.com`）
- 取得 `REVERSED_CLIENT_ID`（形如 `com.googleusercontent.apps.xxxxxxxx`）

---

## 詳細設計

### `client/src/lib/googleAuth.ts`（新增）

```typescript
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from './supabase';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isGoogleCancelError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  // Plugin 取消代碼或訊息
  return (
    e.code === '12501' ||
    (typeof e.message === 'string' &&
      (e.message.toLowerCase().includes('cancel') ||
        e.message.toLowerCase().includes('dismissed')))
  );
}

export async function nativeGoogleSignIn(): Promise<{ error: Error | null; cancelled: boolean }> {
  try {
    await GoogleAuth.initialize(); // 確保初始化（插件內部有 guard，重複呼叫安全）
    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser?.authentication?.idToken;

    if (!idToken) {
      throw new Error('No idToken returned from Google Sign-In');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) return { error: new Error(error.message), cancelled: false };
    return { error: null, cancelled: false };
  } catch (err: unknown) {
    if (isGoogleCancelError(err)) {
      return { error: null, cancelled: true };
    }
    const error = err instanceof Error ? err : new Error(String(err));
    return { error, cancelled: false };
  }
}
```

### `client/capacitor.config.ts`（修改）

在 `plugins` 區塊加入：

```typescript
GoogleAuth: {
  scopes: ['profile', 'email'],
  serverClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // Web Client ID（用於 token 驗證）
  forceCodeForRefreshToken: true,
}
```

### `client/ios/App/App/Info.plist`（修改）

在 `CFBundleURLTypes` 陣列加入新的 URL Scheme（用於 OAuth callback）：

```xml
<dict>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>REVERSED_CLIENT_ID_FROM_GOOGLE_CONSOLE</string>
  </array>
</dict>
```

### `handleLogin('google')` 修改模式（profile 與 OnboardingModal 相同）

```typescript
// Before（兩個地方都這樣）：
const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });

// After：
import { isNativePlatform, nativeGoogleSignIn } from '@/lib/googleAuth';

if (isNativePlatform()) {
  const { error, cancelled } = await nativeGoogleSignIn();
  if (cancelled) return;
  if (error) { /* 顯示錯誤 */ return; }
  // 登入成功，router.push('/') 等後續流程不變
} else {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
  if (error) { /* 顯示錯誤 */ }
}
```

---

## 安裝指令

```bash
cd client
npm install @codetrix-studio/capacitor-google-auth
npx cap sync ios
```

---

## 驗收標準

1. iOS App 點擊「繼續使用 Google」→ 跳出 native Google 帳號選擇器 sheet，**不離開 App**
2. 選擇帳號 → 授權完成 → 直接回到 App 首頁（已登入狀態）
3. 取消選擇 → 靜默返回，不顯示錯誤
4. Web 端 Google 登入行為不受影響（維持 OAuth redirect）
5. Supabase user 正確建立（email provider: google）

---

## 不在範圍內

- 不修改 Apple Sign-In 邏輯
- 不更動 Google Books API 或其他 Google 服務
- Google Cloud Console 設定由開發者手動完成（文件記錄即可，不自動化）
