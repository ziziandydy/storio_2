# Apple Sign-In 功能設計文件

**日期**: 2026-04-05
**狀態**: Approved
**Bundle ID**: `com.storio.app`

---

## 目標

在 Storio iOS 原生 App 與 Web / PWA 兩個平台上，同時支援 Apple 登入：
- **iOS 原生（Capacitor）**: 系統 Face ID / Apple ID 彈窗（native Sign in with Apple）
- **Web / PWA**: OAuth redirect 流程（supabase.auth.signInWithOAuth）

驗收標準：Web 可成功登入 + 真實 iPhone 可用 Face ID / Apple ID 登入。

---

## 架構設計

### 流程圖

```
[Apple 按鈕] → handleLogin('apple')
      │
      ├─ isNativePlatform() === true
      │   → SignInWithApple.authorize()      ← 系統原生彈窗（Face ID）
      │   → supabase.signInWithIdToken()     ← 取 idToken 換 Supabase session
      │   → onAuthStateChange fires          ← 自動處理 migration + profile check
      │
      └─ isNativePlatform() === false
          → supabase.signInWithOAuth()       ← redirect 至 Apple → /auth/callback
          → /auth/callback page              ← 現有邏輯，不需改動
```

### 方案選擇理由

採用 **Hybrid 方案**（native + web 各一條路），理由如下：
- Web OAuth redirect 在 WKWebView 中不穩定，iOS 原生 App 必須使用 native plugin
- Apple 審核規定：若 App 提供第三方社交登入（如 Google），必須同時提供 Sign in with Apple
- `@capacitor-community/apple-sign-in` 只支援原生平台，web 仍需 `signInWithOAuth`
- `Capacitor.isNativePlatform()` 可準確偵測執行環境，做到透明切換

---

## 需要手動設定的步驟（非程式碼）

### 1. Apple Developer Console

**步驟 1：啟用 App ID 的 Sign in with Apple**
- 前往 [developer.apple.com](https://developer.apple.com) → Certificates, IDs & Profiles → Identifiers
- 找到 `com.storio.app` → Edit → 勾選 **Sign in with Apple** → Save

**步驟 2：建立 Services ID（供 Web OAuth 使用）**
- Identifiers → `+` → 選 **Services IDs** → Continue
- Description: `Storio Web`
- Identifier: `com.storio.app.web`
- Register → 點擊進入編輯 → 勾選 **Sign in with Apple** → Configure
  - Primary App ID: `com.storio.app`
  - Domains and Subdomains: `storio.andismtu.com`
  - Return URLs: `https://[supabase-project-ref].supabase.co/auth/v1/callback`
- Save → Continue → Register

**步驟 3：建立 Key（產生私鑰）**
- Keys → `+` → Key Name: `Storio Sign in with Apple`
- 勾選 **Sign in with Apple** → Configure → Primary App ID: `com.storio.app`
- Continue → Register → **下載 .p8 檔案**（只能下載一次）
- 記下 **Key ID** 與 **Team ID**（Team ID 在 developer.apple.com 右上角 Account 頁面）

### 2. Supabase Dashboard

- Authentication → Providers → **Apple** → Enable
- 填入：
  - **Client ID** (Services ID): `com.storio.app.web`
  - **Team ID**: `[來自 Apple Developer 右上角]`
  - **Key ID**: `[來自 Key 詳情頁]`
  - **Private Key**: `[.p8 檔案的完整內容]`
- Redirect URLs → 新增 `https://storio.andismtu.com/auth/callback`

### 3. Xcode

- 開啟 `client/ios/App/App.xcworkspace`
- 點選 App target → **Signing & Capabilities** → `+ Capability` → 搜尋並加入 **Sign in with Apple**
- 這會自動建立 / 更新 `App.entitlements`，加入 `com.apple.developer.applesignin = ["Default"]`

---

## 程式碼變更

### 新增檔案：`client/src/lib/appleAuth.ts`

封裝 native Apple Sign-In 邏輯：

```typescript
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { supabase } from './supabase';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** 用戶主動取消 Apple 授權時，@capacitor-community/apple-sign-in 拋出 code 1001 */
export function isAppleCancelError(err: any): boolean {
  return err?.code === '1001' || err?.message?.includes('canceled') || err?.message?.includes('cancelled');
}

export async function nativeAppleSignIn(): Promise<{ error: Error | null; cancelled: boolean }> {
  try {
    // 產生隨機 nonce（Supabase 用來驗證 Apple ID Token，防止 replay attack）
    const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const options: SignInWithAppleOptions = {
      clientId: 'com.storio.app',
      redirectURI: '',
      scopes: 'email name',
      state: '',
      nonce: rawNonce,
    };

    const result = await SignInWithApple.authorize(options);
    const { identityToken, givenName, familyName } = result.response;

    if (!identityToken) {
      throw new Error('No identity token returned from Apple');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce, // 必須與 authorize() 傳入的 nonce 一致
    });

    if (error) return { error: new Error(error.message), cancelled: false };

    // Apple 僅首次授權時提供 givenName / familyName
    // 若有值，主動寫入 user_metadata.full_name 供 profile 步驟 pre-fill
    if (givenName || familyName) {
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }

    return { error: null, cancelled: false };
  } catch (err: any) {
    if (isAppleCancelError(err)) {
      return { error: null, cancelled: true }; // 用戶主動取消，非錯誤
    }
    return { error: err, cancelled: false };
  }
}
```

### 修改：`client/src/app/page.tsx`

更新 `handleLogin`，加入 native 分支：

```typescript
import { isNativePlatform, nativeAppleSignIn } from '@/lib/appleAuth';

const handleLogin = async (provider: 'google' | 'apple' | 'email') => {
  try {
    if (provider === 'apple' && isNativePlatform()) {
      const { error, cancelled } = await nativeAppleSignIn();
      if (cancelled) return; // 用戶主動取消，靜默處理，不顯示 toast
      if (error) throw error;
      // 登入成功後確認 profile 狀態，決定 modal 下一步
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser && !signedInUser.user_metadata?.profile_completed) {
        setOnboardingStep('profile'); // modal 停留並切換至 profile 步驟
      } else {
        setShowOnboarding(false);
      }
    } else {
      // Web 路徑：Google 或 Apple OAuth redirect
      // 前提：Supabase Dashboard 已設定對應 provider（Apple 需填入 Services ID / Team ID / Key）
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo: getURL('/auth/callback') }
      });
      if (error) throw error;
      // redirect 後由 /auth/callback → page.tsx useEffect 自動偵測 profile_completed 並顯示 profile 步驟
    }
  } catch (error) {
    console.error('Login failed:', error);
    // showToast 可在此加入
  }
};
```

### 安裝依賴

```bash
# 在 client/ 目錄下
pnpm add @capacitor-community/apple-sign-in
npx cap sync ios
```

> **前置確認**：Xcode → App target → Deployment Info → iOS **14.0** 以上（現有設定為 14.0，符合要求）。`@capacitor-community/apple-sign-in` 最低需求為 iOS 13，但 Capacitor 7 本身要求 14+，無衝突。

> **Supabase project ref 查找**：Supabase Dashboard → Settings → API → Project URL，格式為 `https://[project-ref].supabase.co`，取中括號部分填入 Apple Services ID 的 Return URL。

---

## 不需要修改的檔案

| 檔案 | 原因 |
|------|------|
| `OnboardingModal.tsx` | Apple 按鈕已存在，呼叫 `onLogin('apple')` 不變 |
| `useAuth.ts` | 匿名帳號 migration + `onAuthStateChange` 已完整處理 |
| `/auth/callback/page.tsx` | Web OAuth redirect 路徑不變 |

---

## 測試計畫

| 情境 | 平台 | 驗收條件 |
|------|------|---------|
| 新用戶 Apple 登入 | Web | OAuth redirect → `/auth/callback` → `page.tsx useEffect` 偵測 `!profile_completed` → 自動顯示 profile 步驟 |
| 新用戶 Apple 登入 | iOS 真機 | 系統彈窗 → Face ID → modal 切換至 profile 步驟；`full_name` 已 pre-fill（Apple 首次提供） |
| 已完成 profile 的舊用戶 | Web | redirect → 直接進入首頁，不顯示 profile 步驟 |
| 已完成 profile 的舊用戶 | iOS 真機 | Face ID → modal 關閉，直接進入首頁 |
| 取消 Apple 授權 | iOS 真機 | 彈窗關閉，modal 停留在 social 步驟，**無 error toast**（code 1001 靜默處理） |
| 取消 Apple 授權 | Web | popup 關閉，頁面無變化，無 error toast |
| 訪客資料遷移 | iOS 真機 | 訪客收藏在 Apple 登入後自動保留（`migrate_guest_data` RPC 既有邏輯覆蓋） |
| 同一 Apple ID 跨平台 | Web → iOS | 同一帳號在 web 登入後，native 再次登入應合併為同一 Supabase session，無重複帳號 |

---

## 依賴清單

- `@capacitor-community/apple-sign-in` — Capacitor native Apple Sign-In plugin
- Supabase Apple OAuth provider（需手動設定）
- Apple Developer App ID + Services ID + Key（需手動建立）
