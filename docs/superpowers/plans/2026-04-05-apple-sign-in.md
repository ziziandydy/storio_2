# Apple Sign-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Storio iOS 原生 App 與 Web/PWA 同時支援 Apple 登入（native Face ID + web OAuth redirect）

**Architecture:** 以 `Capacitor.isNativePlatform()` 偵測執行環境，native 路徑用 `@capacitor-community/apple-sign-in` 取得 identityToken 後呼叫 `supabase.signInWithIdToken`；web 路徑沿用現有 `supabase.signInWithOAuth`。所有邏輯集中於新的 `appleAuth.ts` helper，`page.tsx` 只加一個 if 分支。

**Tech Stack:** `@capacitor-community/apple-sign-in`, Supabase JS SDK (`signInWithIdToken`), Web Crypto API (`crypto.subtle.digest` for nonce SHA-256), TypeScript

---

## File Map

| 動作 | 路徑 | 職責 |
|------|------|------|
| **Create** | `client/src/lib/appleAuth.ts` | 封裝 native Apple Sign-In：nonce 生成、authorize、idToken 換 session、取消偵測、name 寫入 |
| **Modify** | `client/src/app/page.tsx` | `handleLogin` 加入 native Apple 分支，約 10 行 |
| **Install** | `client/package.json` + `client/ios/App/Podfile.lock` | 新增 `@capacitor-community/apple-sign-in` 依賴 |

不需修改：`OnboardingModal.tsx`、`useAuth.ts`、`/auth/callback/page.tsx`

---

## Task 1：安裝 npm 套件並同步 iOS

**Files:**
- Modify: `client/package.json`（自動更新）
- Modify: `client/ios/App/Podfile.lock`（自動更新）

- [ ] **Step 1：安裝套件**

```bash
cd client
pnpm add @capacitor-community/apple-sign-in
```

預期輸出：`packages/apple-sign-in` 版本號出現在 `package.json` dependencies

- [ ] **Step 2：同步 iOS**

```bash
npx cap sync ios
```

預期輸出：`✔ Copying web assets` 及 `✔ Updating iOS native dependencies`，無 error

- [ ] **Step 3：確認 TypeScript 能找到型別**

```bash
pnpm tsc --noEmit 2>&1 | grep -i apple
```

預期輸出：空（無 apple 相關型別錯誤）。若有 `cannot find module '@capacitor-community/apple-sign-in'`，確認 `pnpm install` 完成。

- [ ] **Step 4：執行 pod install**

`cap sync ios` 更新 Podfile 但不安裝 pod，需手動跑：

```bash
cd client/ios/App && pod install && cd ../../..
```

預期輸出：`Pod installation complete!`，無 error。

- [ ] **Step 5：Commit**

```bash
git add client/package.json client/pnpm-lock.yaml client/ios/App/Podfile client/ios/App/Podfile.lock
git commit -m "chore: add @capacitor-community/apple-sign-in"
```

---

## Task 2：建立 `appleAuth.ts`

**Files:**
- Create: `client/src/lib/appleAuth.ts`

- [ ] **Step 1：建立檔案，先只 export 型別與空 stub，確認 TypeScript 編譯通過**

建立 `client/src/lib/appleAuth.ts`：

```typescript
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { supabase } from './supabase';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAppleCancelError(err: any): boolean {
  return err?.code === '1001' || err?.message?.includes('canceled') || err?.message?.includes('cancelled');
}

export async function nativeAppleSignIn(): Promise<{ error: Error | null; cancelled: boolean }> {
  return { error: new Error('not implemented'), cancelled: false };
}
```

- [ ] **Step 2：確認 stub 編譯通過**

```bash
cd client && pnpm tsc --noEmit 2>&1 | head -20
```

預期輸出：0 errors（或只有與此檔無關的既有錯誤）

- [ ] **Step 3：實作完整的 `nativeAppleSignIn`**

將 `client/src/lib/appleAuth.ts` 的 `nativeAppleSignIn` 替換為完整實作：

```typescript
import { Capacitor } from '@capacitor/core';
import { SignInWithApple, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';
import { supabase } from './supabase';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/** 用戶主動取消 Apple 授權時，plugin 拋出 code 1001 */
export function isAppleCancelError(err: any): boolean {
  return err?.code === '1001' || err?.message?.includes('canceled') || err?.message?.includes('cancelled');
}

export async function nativeAppleSignIn(): Promise<{ error: Error | null; cancelled: boolean }> {
  try {
    // rawNonce 傳給 Supabase；sha256(rawNonce) 傳給 Apple（Apple 規格要求）
    const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const hashedNonceBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce));
    const hashedNonce = Array.from(new Uint8Array(hashedNonceBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const options: SignInWithAppleOptions = {
      clientId: 'com.storio.app',
      redirectURI: '', // native 模式不需要，傳空字串
      scopes: 'email name',
      state: '',
      nonce: hashedNonce,
    };

    const result = await SignInWithApple.authorize(options);
    const { identityToken, givenName, familyName } = result.response;

    if (!identityToken) {
      throw new Error('No identity token returned from Apple');
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: identityToken,
      nonce: rawNonce, // Supabase 內部自行 sha256 後與 token 比對
    });

    if (error) return { error: new Error(error.message), cancelled: false };

    // Apple 只在首次授權提供 givenName / familyName，有值就寫入 metadata 供 profile 步驟 pre-fill
    if (givenName || familyName) {
      const fullName = [givenName, familyName].filter(Boolean).join(' ');
      await supabase.auth.updateUser({ data: { full_name: fullName } });
    }

    return { error: null, cancelled: false };
  } catch (err: any) {
    if (isAppleCancelError(err)) {
      return { error: null, cancelled: true };
    }
    return { error: err, cancelled: false };
  }
}
```

- [ ] **Step 4：確認完整實作編譯通過**

```bash
cd client && pnpm tsc --noEmit 2>&1 | head -20
```

預期輸出：0 errors

- [ ] **Step 5：Commit**

```bash
git add client/src/lib/appleAuth.ts
git commit -m "feat: add appleAuth helper — native Apple Sign-In with nonce + cancel handling"
```

---

## Task 3：更新 `page.tsx` 的 `handleLogin`

**Files:**
- Modify: `client/src/app/page.tsx:1-18`（imports）
- Modify: `client/src/app/page.tsx:90-102`（handleLogin function）

- [ ] **Step 1：在 `page.tsx` 頂部加入 import**

在 `client/src/app/page.tsx` 第 18 行（`import { SplashScreen as NativeSplash }...` 之後）加入：

```typescript
import { isNativePlatform, nativeAppleSignIn } from '@/lib/appleAuth';
```

- [ ] **Step 2：替換 `handleLogin` 函式**

找到 `client/src/app/page.tsx` 的以下程式碼（約第 90-102 行）：

```typescript
  const handleLogin = async (provider: 'google' | 'apple' | 'email') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: getURL('/auth/callback')
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
```

替換為：

```typescript
  const handleLogin = async (provider: 'google' | 'apple' | 'email') => {
    try {
      if (provider === 'apple' && isNativePlatform()) {
        const { error, cancelled } = await nativeAppleSignIn();
        if (cancelled) return; // 用戶主動取消，靜默處理
        if (error) throw error;
        // 登入成功：關閉 modal，讓 onAuthStateChange → page.tsx useEffect 自動接手
        // （useEffect 會偵測 profile_completed，決定是否重新開啟 profile 步驟）
        setShowOnboarding(false);
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: provider as any,
          options: { redirectTo: getURL('/auth/callback') }
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
```

- [ ] **Step 3：確認編譯通過**

```bash
cd client && pnpm tsc --noEmit 2>&1 | head -20
```

預期輸出：0 errors

- [ ] **Step 4：在瀏覽器做 Web OAuth 快速驗證**

```bash
cd client && pnpm dev
```

開啟 `http://localhost:3000`，點 Apple 登入按鈕。
預期：瀏覽器跳轉至 Apple OAuth 登入頁面。
確認：**不應** 停在原頁或顯示 native 模式的錯誤（`isNativePlatform()` 在瀏覽器必須返回 `false`）。

- [ ] **Step 5：Commit**

```bash
git add client/src/app/page.tsx
git commit -m "feat: Apple Sign-In hybrid — native Face ID on iOS, OAuth redirect on web"
```

---

## Task 4：Build iOS 並在真機驗證

**Files:**
- 無程式碼變更

前置條件：Xcode 已加入 Sign in with Apple capability（Signing & Capabilities → + Capability → Sign in with Apple）

- [ ] **Step 1：Build 並部署至真機**

```bash
cd client
pnpm run build
npx cap sync ios
npx cap open ios
```

在 Xcode 中選擇真實 iPhone → Run（⌘R）

- [ ] **Step 2：驗證 native Apple 登入**

在 iPhone 上：
1. 點 Apple 登入按鈕
2. 應彈出系統授權視窗（Face ID / Touch ID / Apple ID 密碼）
3. 授權後 modal 應切換至 profile 填寫步驟（新用戶）或直接關閉（舊用戶）

- [ ] **Step 3：驗證取消行為**

在 iPhone 上：
1. 點 Apple 登入按鈕
2. 彈窗出現後點取消
3. modal 應停留在 social 步驟，**不出現 error toast**

- [ ] **Step 4：驗證訪客資料遷移**

在 iPhone 上：
1. 以 Guest 身分新增 1 筆收藏
2. 點 Apple 登入
3. 登入完成後進入首頁，確認剛才的收藏仍存在

- [ ] **Step 5：驗證跨平台帳號合併（同一 Apple ID）**

1. 先在**瀏覽器** Web 版以 Apple OAuth 登入，記下 Supabase user ID（Profile 頁面或 DevTools）
2. 在**真機** iPhone 以同一 Apple ID 登入
3. 進入首頁後確認：兩次登入顯示同一個帳號的收藏資料（無重複帳號，user ID 相同）

---

## 驗收 Checklist

- [ ] Web：點 Apple 按鈕會 redirect 至 Apple OAuth 頁面
- [ ] iOS 真機：點 Apple 按鈕會彈出系統 Face ID / Apple ID 視窗
- [ ] iOS 真機：新用戶登入後顯示 profile 填寫步驟
- [ ] iOS 真機：舊用戶登入後直接進入首頁
- [ ] iOS 真機：取消授權無 error toast
- [ ] iOS 真機：訪客收藏在 Apple 登入後保留
- [ ] `pnpm tsc --noEmit` 無新增錯誤
- [ ] 同一 Apple ID 在 Web 與 iOS 登入後為同一 Supabase 帳號（無重複帳號）
