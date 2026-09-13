# Android 上架技術落地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Storio 具備可上架 Google Play 的 Android 版本，與 iOS 完整功能對等。

**Architecture:** 以 Capacitor 官方 Android 平台為基礎，比照 iOS 當初的建置/簽署/驗證模式；程式碼層面的平台差異一律透過 `Capacitor.getPlatform()` 精確判斷（而非只判斷 `isNativePlatform()`），逐項修復 8 個已知缺口。純邏輯類任務走 TDD（vitest），純原生設定/資源類任務以「模擬器手動驗證清單」取代自動化測試——這類任務本質上無法用單元測試覆蓋（Gradle 設定、Android Manifest 權限、Google Cloud Console OAuth 設定、簽署金鑰、圖示資源都是原生工具鏈的產物，不是可斷言的函式）。

**Tech Stack:** Capacitor 7.x、Next.js 14 (App Router)、Android Studio / Gradle、vitest（前端單元測試）

**Spec:** `docs/superpowers/specs/2026-09-13-android-launch-design.md`

## Global Constraints

- v1 範圍：完整功能對等——iOS 已有功能都要在 Android 上可用，不新增 iOS 沒有的功能
- 不新增 Android CI，比照 iOS 現況（手動本地 build，無自動化 CI/CD）
- 簽署策略：Play App Signing（本地只產生 upload keystore，Google 保管真正簽署金鑰）
- 執行順序：模擬器優先、逐項修復——真機驗收是送審前最後關卡，不是啟動門檻
- 只處理 spec 列出的 8 個技術缺口，不預防性修改其他無關程式碼
- 所有指令預設在 `client/` 目錄下執行（除非另有標註）

---

### Task 1: 加入 Capacitor Android 平台 + 最小可跑 build

**Files:**
- Modify: `client/package.json`（新增 `@capacitor/android` dependency）
- Create: `client/android/`（`npx cap add android` 產生的整個原生專案目錄）

**Interfaces:**
- Produces: `client/android/` 原生專案（後續所有任務的前提）；`npx cap sync android` 指令（後續任務重複使用）

- [ ] **Step 1: 安裝 Android 平台套件**

```bash
cd client
npm install @capacitor/android
```

- [ ] **Step 2: 加入 Android 平台**

```bash
npx cap add android
```

Expected: 產生 `client/android/` 目錄，內含 `app/`、`build.gradle`、`settings.gradle` 等標準 Capacitor Android 專案結構。

- [ ] **Step 3: 同步 web build 到 Android**

```bash
npm run build
npx cap sync android
```

Expected: 無錯誤訊息，`client/android/app/src/main/assets/public/` 出現同步後的靜態檔案。

- [ ] **Step 4: 手動驗證——模擬器最小可跑 build**

用 Android Studio 開啟 `client/android/`，建立一個 Pixel 系列 API 34 模擬器，點擊 Run。

Expected checklist：
- [ ] App 成功安裝並啟動，沒有立即 crash
- [ ] WebView 載入首頁（黑底 Storio 畫面），即使功能還不能用也沒關係
- [ ] Logcat（`adb logcat | grep Capacitor`）沒有出現 fatal exception

- [ ] **Step 5: Commit**

```bash
git add client/package.json client/package-lock.json client/android
git commit -m "feat(android): 加入 Capacitor Android 平台，模擬器最小可跑 build"
```

---

### Task 2: 平台判斷 helper + Android 隱藏 Apple 登入

**Files:**
- Modify: `client/src/lib/appleAuth.ts`
- Modify: `client/src/components/OnboardingModal.tsx:1-10,249-255`
- Modify: `client/src/app/page.tsx:96`
- Modify: `client/src/app/profile/page.tsx:300`
- Test: `client/src/lib/__tests__/appleAuth.test.ts`（新檔案）

**Interfaces:**
- Consumes: `Capacitor` from `@capacitor/core`（既有依賴）
- Produces: `isIOSPlatform(): boolean`（供 `OnboardingModal.tsx`、`page.tsx`、`profile/page.tsx` 使用）

- [ ] **Step 1: 寫失敗測試**

Create `client/src/lib/__tests__/appleAuth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getPlatformMock = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: (...args: unknown[]) => getPlatformMock(...args),
  },
}));

vi.mock('@capacitor-community/apple-sign-in', () => ({
  SignInWithApple: { authorize: vi.fn() },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithIdToken: vi.fn(), updateUser: vi.fn() } },
}));

import { isIOSPlatform } from '@/lib/appleAuth';

describe('isIOSPlatform', () => {
  beforeEach(() => getPlatformMock.mockReset());

  it('平台是 ios 時回傳 true', () => {
    getPlatformMock.mockReturnValue('ios');
    expect(isIOSPlatform()).toBe(true);
  });

  it('平台是 android 時回傳 false', () => {
    getPlatformMock.mockReturnValue('android');
    expect(isIOSPlatform()).toBe(false);
  });

  it('平台是 web 時回傳 false', () => {
    getPlatformMock.mockReturnValue('web');
    expect(isIOSPlatform()).toBe(false);
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
npx vitest run src/lib/__tests__/appleAuth.test.ts
```

Expected: FAIL，錯誤訊息為 `isIOSPlatform is not a function` 或類似的 export 不存在錯誤。

- [ ] **Step 3: 實作 `isIOSPlatform()`**

在 `client/src/lib/appleAuth.ts` 的 `isNativePlatform()` 之後加入：

```ts
export function isIOSPlatform(): boolean {
  return Capacitor.getPlatform() === 'ios';
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
npx vitest run src/lib/__tests__/appleAuth.test.ts
```

Expected: PASS，3 個測試全過。

- [ ] **Step 5: Android 上隱藏 Apple 登入按鈕**

在 `client/src/components/OnboardingModal.tsx` 第 7 行後加入 import：

```ts
import { isIOSPlatform } from '@/lib/appleAuth';
```

把第 249-255 行的 Apple 按鈕包上條件渲染：

```tsx
{isIOSPlatform() && (
    <button 
        onClick={() => onLogin('apple')}
        className="w-full py-4 bg-black border border-white/20 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-[0.98]"
    >
        <Image src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg" width={18} height={18} alt="Apple" className="invert" />
        {t.onboarding.apple}
    </button>
)}
```

- [ ] **Step 6: 把 `handleLogin` 的判斷改用 `isIOSPlatform()`**

`client/src/app/page.tsx` 第 96 行，把：
```ts
if (provider === 'apple' && isNativePlatform()) {
```
改成：
```ts
if (provider === 'apple' && isIOSPlatform()) {
```
並在檔案 import 區加入 `isIOSPlatform`（與既有 `isNativePlatform, nativeAppleSignIn` 同一行 import from `@/lib/appleAuth`）。

`client/src/app/profile/page.tsx` 第 300 行做同樣的修改。

- [ ] **Step 7: 執行全套前端單元測試確認沒有回歸**

```bash
npx vitest run
```

Expected: 全部通過，無新增失敗。

- [ ] **Step 8: 手動驗證——模擬器上確認 Apple 按鈕消失**

在 Task 1 建立的 Android 模擬器上開啟 Onboarding 畫面，確認畫面上只有 Google 登入與 Email 登入兩個按鈕，沒有 Apple 登入按鈕。

- [ ] **Step 9: Commit**

```bash
git add client/src/lib/appleAuth.ts client/src/lib/__tests__/appleAuth.test.ts client/src/components/OnboardingModal.tsx client/src/app/page.tsx client/src/app/profile/page.tsx
git commit -m "feat(android): 新增 isIOSPlatform() helper，Android 上隱藏 Apple 登入選項"
```

---

### Task 3: Google 登入 Android Client ID 設定

**Files:**
- Modify: `client/capacitor.config.ts`
- Modify: `client/.env.local`（開發者本機設定，不進 git）
- Modify: `client/.env.production`

**Interfaces:**
- Consumes: Task 1 產生的 `client/android/app/` 簽署資訊（需要 debug keystore 的 SHA-1 才能在 Google Cloud Console 註冊 OAuth Client）
- Produces: `capacitor.config.ts` 的 `GoogleAuth.androidClientId` 設定值

- [ ] **Step 1: 取得 debug keystore 的 SHA-1 指紋**

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Expected: 輸出包含一行 `SHA1: XX:XX:XX:...`，複製這串值。

- [ ] **Step 2: Google Cloud Console 建立 Android OAuth Client**

前往 Google Cloud Console → APIs & Services → Credentials → Create Credentials → OAuth Client ID → Application type: Android。填入：
- Package name: `com.storio.app`
- SHA-1 certificate fingerprint: Step 1 取得的值

Expected: 產生一組新的 Android OAuth Client ID（`xxxxx.apps.googleusercontent.com`）。

- [ ] **Step 3: 更新 `capacitor.config.ts`**

在 `readEnvValue` 讀取區塊仿照既有 `googleIosClientId` 的寫法新增：

```ts
const googleAndroidClientId =
  readEnvValue(envLocal, 'GOOGLE_ANDROID_CLIENT_ID') ??
  readEnvValue(envProduction, 'GOOGLE_ANDROID_CLIENT_ID') ??
  process.env.GOOGLE_ANDROID_CLIENT_ID;
```

`GoogleAuth` plugin 設定區塊新增 `androidClientId`：

```ts
    GoogleAuth: {
      clientId: googleIosClientId ?? '',
      androidClientId: googleAndroidClientId ?? '',
      scopes: ['profile', 'email'],
      serverClientId: googleWebClientId ?? '',
      forceCodeForRefreshToken: true,
    },
```

- [ ] **Step 4: 補上環境變數**

`client/.env.local` 與 `client/.env.production` 各加一行：

```
GOOGLE_ANDROID_CLIENT_ID=<Step 2 取得的 Client ID>
```

- [ ] **Step 5: 同步並手動驗證**

```bash
npx cap sync android
```

在模擬器上完整走一次 Google 登入流程，確認 `nativeGoogleSignIn()` 能拿到 idToken 並成功呼叫 `supabase.auth.signInWithIdToken`。

Expected checklist：
- [ ] 點擊 Google 登入按鈕跳出系統帳號選擇器
- [ ] 選擇帳號後成功登入，`onAuthStateChange` 正確觸發後續流程
- [ ] 沒有 `No idToken returned from Google Sign-In` 錯誤

- [ ] **Step 6: Commit**

```bash
git add client/capacitor.config.ts
git commit -m "feat(android): 設定 Google 登入 Android Client ID"
```

（`.env.local`/`.env.production` 若已在 `.gitignore` 中則不需 commit，僅供本機/CI 環境變數設定參考）

---

### Task 4: Local Notifications Android 權限設定

**Files:**
- Modify: `client/android/app/src/main/AndroidManifest.xml`
- Create: `client/android/app/src/main/res/drawable/ic_stat_icon_config_sample.xml`（notification small icon，對應 `capacitor.config.ts` 既有的 `smallIcon` 設定）

**Interfaces:**
- Consumes: Task 1 的 `client/android/` 專案
- Produces: Android 13+ 通知權限宣告 + 對應 icon 資源，供 `checkAndRequestPermission()`（`client/src/lib/notifications.ts`，程式碼本身不需修改）實際運作

- [ ] **Step 1: 在 AndroidManifest.xml 加入通知權限**

在 `client/android/app/src/main/AndroidManifest.xml` 的 `<manifest>` 標籤內、`<application>` 標籤之前加入：

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

- [ ] **Step 2: 建立 notification icon 資源**

用現有 App Icon 素材產生一個單色（白色前景、透明背景）的 notification icon，存成 `client/android/app/src/main/res/drawable/ic_stat_icon_config_sample.xml`（Android vector drawable 格式，檔名需與 `capacitor.config.ts` 的 `LocalNotifications.smallIcon: 'ic_stat_icon_config_sample'` 完全一致）。

- [ ] **Step 3: 手動驗證——模擬器上確認通知權限與送達**

```bash
npx cap sync android
```

在模擬器上：
- [ ] 觸發 `checkAndRequestPermission()`（進入 Profile → Notifications 頁面），確認跳出 Android 系統的通知權限對話框（Android 13+ 模擬器映像才會出現此對話框）
- [ ] 授權後，用 `adb shell dumpsys notification` 或直接等待排程時間，確認 churn-rescue 通知能實際顯示在通知欄
- [ ] 確認通知圖示正確顯示（不是預設的破圖示）

- [ ] **Step 4: Commit**

```bash
git add client/android/app/src/main/AndroidManifest.xml client/android/app/src/main/res/drawable/ic_stat_icon_config_sample.xml
git commit -m "feat(android): 新增本機通知 Android 13+ 權限宣告與 notification icon"
```

---

### Task 5: Android 返回鍵處理

**Files:**
- Modify: `client/src/components/AppOpenReset.tsx`
- Test: `client/src/components/__tests__/AppOpenReset.test.tsx`（若無既有測試檔案則新建；若已存在則新增測試案例）

**Interfaces:**
- Consumes: `App` from `@capacitor/app`（既有依賴，已在檔案中 import）
- Produces: 無新增 export，行為變更僅限於 App 生命週期副作用

- [ ] **Step 1: 確認既有測試檔案狀態**

```bash
ls client/src/components/__tests__/AppOpenReset.test.tsx 2>/dev/null || echo "不存在，將新建"
```

- [ ] **Step 2: 在 `AppOpenReset.tsx` 加入 backButton 監聽**

在既有的 `appStateChange` useEffect（第 104-127 行附近）之後，新增一個獨立的 useEffect：

```tsx
  // Android 返回鍵：有瀏覽歷史就導航返回，沒有（在根頁面）才真的退出 App
  useEffect(() => {
    if (!isNativePlatform()) return;

    const handle = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    return () => {
      handle.then((h) => h.remove());
    };
  }, []);
```

- [ ] **Step 3: 手動驗證——模擬器上逐頁測試返回鍵**

在模擬器上（Android 導覽列會有返回鍵/手勢）逐一測試：
- [ ] 首頁按返回鍵 → App 退出（預期行為，因為沒有上一頁）
- [ ] 從首頁進入 Collection 頁後按返回鍵 → 回到首頁（不是直接退出 App）
- [ ] 開啟 AddToFolioModal 後按返回鍵 → 觀察實際行為（記錄下來，若「整頁跳轉導致 Modal 狀態遺失」則列入已知限制，不在本次範圍內修，除非造成資料遺失等嚴重問題）

- [ ] **Step 4: 執行全套前端測試確認沒有回歸**

```bash
npx vitest run
```

Expected: 全部通過。

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AppOpenReset.tsx
git commit -m "feat(android): 新增返回鍵處理，避免無預警直接退出 App"
```

---

### Task 6: 頭像上傳跨平台驗證

**Files:**
- 無預期程式碼修改（此任務為驗證性質）；若模擬器測試發現問題，才回頭修改 `client/src/app/profile/page.tsx` 與 `client/src/components/OnboardingModal.tsx` 的 file input 邏輯

**Interfaces:**
- Consumes: Task 1 的模擬器環境

- [ ] **Step 1: 手動驗證——模擬器上測試頭像上傳兩條路徑**

在模擬器上進入 Profile 編輯頁與 Onboarding 的頭像上傳步驟：
- [ ] 點擊上傳頭像 → 選擇「相機」選項 → 確認能正常拍照並回填圖片
- [ ] 點擊上傳頭像 → 選擇「相簿」選項 → 確認能正常選取既有圖片並回填

- [ ] **Step 2: 記錄結果**

若兩條路徑都正常，此任務視為完成，無需修改程式碼。若發現問題（例如選擇器不彈出、選完圖片後畫面沒有更新），記錄具體錯誤現象與 Logcat 訊息，回報後決定是否需要改走 `@capacitor/camera` plugin（不在本次 plan 範圍內預先實作，因為目前沒有證據顯示需要）。

---

### Task 7: 分享功能全鏈路驗證

**Files:**
- 無預期程式碼修改（此任務為驗證性質）；若發現問題才回頭修改 `client/src/components/ShareModal.tsx`/`MonthlyRecapModal.tsx`

**Interfaces:**
- Consumes: Task 1 的模擬器環境

- [ ] **Step 1: 手動驗證——模擬器上測試全部分享模板**

在模擬器上，對電影/影集/書籍各建立一筆收藏，逐一測試 `ShareModal` 的 6 個模板（Default/Pure/Ticket/RetroTV/Shelf/Desk）與 `MonthlyRecapModal`：
- [ ] 每個模板都能正常產生預覽圖（Puppeteer render → base64 回傳）
- [ ] 點擊分享後，Android 系統原生分享面板正常彈出（`@capacitor/share`）
- [ ] 分享出去的圖片內容正確（不是空白或破圖）

- [ ] **Step 2: 記錄結果**

若全部正常，此任務視為完成。若發現問題，記錄具體現象（哪個模板、什麼錯誤訊息、Logcat/console 內容），比照 iOS 當初 CORS/ATS 案例的除錯方式排查，視情況另開修復任務。

---

### Task 8: Icon / Splash Screen 資源

**Files:**
- Create: `client/android/app/src/main/res/mipmap-*/ic_launcher*.png`（adaptive icon 各解析度）
- Create: `client/android/app/src/main/res/drawable/splash.png`（或對應的 splash 資源，依 Capacitor Splash Screen plugin 慣例）

**Interfaces:**
- Consumes: Task 1 的 `client/android/` 專案結構；既有 App Icon 素材（`client/src/app/**` 或原始設計檔）

- [ ] **Step 1: 產生 Android adaptive icon**

用現有 App Icon 素材（比照 iOS `Assets.xcassets` 使用的原始圖檔），透過 Android Studio 內建的 Image Asset Studio（右鍵 `res/` → New → Image Asset）產生 adaptive icon 的 foreground/background 圖層，涵蓋全部 `mipmap-*` 解析度目錄。

- [ ] **Step 2: 設定 Splash Screen**

依 `capacitor.config.ts` 既有的 `SplashScreen` 設定（`backgroundColor: "#0d0d0d"`），在 `client/android/app/src/main/res/values/styles.xml` 確認 splash 背景色一致，並放入 Storio Logo 素材至對應的 drawable 目錄。

- [ ] **Step 3: 手動驗證——模擬器上確認視覺**

```bash
npx cap sync android
```

在模擬器上：
- [ ] App 啟動時 Splash Screen 背景為純黑 `#0d0d0d`，Logo 正確顯示不糊
- [ ] App 圖示在啟動器（launcher）上正確顯示，不是預設的 Capacitor 綠色機器人圖示

- [ ] **Step 4: Commit**

```bash
git add client/android/app/src/main/res
git commit -m "feat(android): 新增 adaptive icon 與 splash screen 資源"
```

---

### Task 9: 簽署策略——Play App Signing upload keystore

**Files:**
- Create: `client/android/app/upload-keystore.jks`（**不進 git**，需加入 `.gitignore`）
- Modify: `client/android/.gitignore`
- Modify: `client/android/app/build.gradle`（signingConfigs）
- Modify: `client/android/keystore.properties.example`（新建，範例檔，不含真實密碼）

**Interfaces:**
- Consumes: Task 1 的 `client/android/` 專案
- Produces: release build 簽署設定，供 Task 10 的建置腳本使用

- [ ] **Step 1: 產生 upload keystore**

```bash
cd client/android/app
keytool -genkey -v -keystore upload-keystore.jks -alias storio-upload -keyalg RSA -keysize 2048 -validity 10000
```

依提示輸入密碼與基本資訊（組織名稱可填 Storio），**密碼務必安全保存，遺失需走 Google 帳號復原流程**。

- [ ] **Step 2: 確認 keystore 不進 git**

在 `client/android/.gitignore` 加入：
```
app/upload-keystore.jks
keystore.properties
```

- [ ] **Step 3: 建立 keystore.properties 範例檔**

Create `client/android/keystore.properties.example`:
```properties
storeFile=upload-keystore.jks
storePassword=<你的密碼>
keyAlias=storio-upload
keyPassword=<你的密碼>
```

開發者本機複製一份為 `client/android/keystore.properties`（不進 git）並填入真實密碼。

- [ ] **Step 4: 在 `build.gradle` 設定 signingConfigs**

在 `client/android/app/build.gradle` 的 `android { }` 區塊內加入：

```gradle
def keystorePropertiesFile = rootProject.file("app/keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

- [ ] **Step 5: 手動驗證——產生已簽署的 release bundle**

```bash
cd client/android
./gradlew bundleRelease
```

Expected: `client/android/app/build/outputs/bundle/release/app-release.aab` 產生成功，無簽署相關錯誤。

- [ ] **Step 6: Commit**

```bash
git add client/android/.gitignore client/android/app/build.gradle client/android/keystore.properties.example
git commit -m "feat(android): 設定 Play App Signing upload keystore 簽署流程"
```

---

### Task 10: 建置與版號腳本

**Files:**
- Create: `client/scripts/build-android.sh`
- Modify: `client/scripts/bump-version.sh`

**Interfaces:**
- Consumes: Task 9 的簽署設定；既有 `npm run release`（standard-version）產生的 `package.json` 版號
- Produces: `npm run build:android`、`bump-version.sh --sync`/`--build` 對 Android 的支援

- [ ] **Step 1: 新增 `build-android.sh`**

Create `client/scripts/build-android.sh`（比照 `build-ios.sh` 的邏輯，改用 `cap sync android`）：

```sh
#!/bin/sh
# Android Production Build Script
# 暫時移除 .env.local，讓 Next.js 使用 .env.production 的值進行打包

set -e

MOVED=0

cleanup() {
  if [ $MOVED -eq 1 ] && [ -f .env.local.bak ]; then
    mv .env.local.bak .env.local
    echo "✓ .env.local 已還原"
  fi
}
trap cleanup EXIT

if [ -f .env.local ]; then
  mv .env.local .env.local.bak
  MOVED=1
  echo "→ 暫時移除 .env.local，使用 .env.production 打包"
fi

echo "→ 開始 next build (production)..."
next build

echo "→ 同步至 Capacitor Android..."
npx cap sync android

echo "✓ Android production build 完成，請執行 cd android && ./gradlew bundleRelease"
```

- [ ] **Step 2: 賦予執行權限並在 `package.json` 加入指令**

```bash
chmod +x client/scripts/build-android.sh
```

在 `client/package.json` 的 `scripts` 加入：
```json
"build:android": "sh scripts/build-android.sh",
```

- [ ] **Step 3: 擴充 `bump-version.sh` 支援 Android**

在 `client/scripts/bump-version.sh` 現有讀取 `PBXPROJ`/`CURRENT_IOS_VERSION` 的區塊之後，新增讀取 Android `build.gradle` 版號的邏輯：

```bash
BUILD_GRADLE="$CLIENT_DIR/android/app/build.gradle"
CURRENT_ANDROID_VERSION_NAME=$(grep 'versionName' "$BUILD_GRADLE" | head -1 | sed 's/.*versionName "\(.*\)"/\1/' | tr -d '[:space:]')
CURRENT_ANDROID_VERSION_CODE=$(grep 'versionCode' "$BUILD_GRADLE" | head -1 | sed 's/.*versionCode \([0-9]*\)/\1/' | tr -d '[:space:]')
```

在既有「更新 MARKETING_VERSION」與「更新 CURRENT_PROJECT_VERSION」的區塊之後，加入對應的 Android 更新邏輯：

```bash
NEW_ANDROID_VERSION_CODE=$((CURRENT_ANDROID_VERSION_CODE + 1))

sed -i '' "s/versionName \"$CURRENT_ANDROID_VERSION_NAME\"/versionName \"$NEW_VERSION\"/g" "$BUILD_GRADLE"
echo "✅ Android versionName → $NEW_VERSION"

sed -i '' "s/versionCode $CURRENT_ANDROID_VERSION_CODE/versionCode $NEW_ANDROID_VERSION_CODE/g" "$BUILD_GRADLE"
echo "✅ Android versionCode → $NEW_ANDROID_VERSION_CODE"
```

並在最後的 `git -C "$CLIENT_DIR/.." add` 那行加入 `"client/android/app/build.gradle"`。

- [ ] **Step 4: 手動驗證**

```bash
cd client
npm run build:android
```

Expected: 執行完畢無錯誤，`android/app/src/main/assets/public/` 更新為最新 build。

```bash
./scripts/bump-version.sh --build
```

Expected: `android/app/build.gradle` 的 `versionCode` 遞增 1，`versionName` 不變，且與 `pbxproj` 的 iOS build number 同步遞增（因為腳本是共用的 `--build` 模式）。

- [ ] **Step 5: Commit**

```bash
git add client/scripts/build-android.sh client/scripts/bump-version.sh client/package.json
git commit -m "feat(android): 新增 build-android.sh，bump-version.sh 擴充支援 Android 版號"
```

---

### Task 11: 真機驗收（等待實體裝置到位後執行，非現在阻塞項）

**Files:** 無程式碼變更，純驗證任務

**Interfaces:**
- Consumes: Task 1-10 全部完成的 Android 專案 + 使用者取得的實體 Android 測試機

**執行時機**：使用者取得實體 Android 裝置後才進行，是送審前的最後關卡，不阻塞前面 10 個任務的推進。

- [ ] **Step 1: 安裝並啟動**

用 `adb install` 或 Android Studio 直接部署已簽署的 release build 到實體裝置。

- [ ] **Step 2: 核心動線驗收清單**

- [ ] 登入（Google 登入、Email OTP 登入）
- [ ] 新增收藏（電影/書籍/影集，含分季收藏）
- [ ] 評分與心得（含 AI 潤飾）
- [ ] 本機通知（權限請求、churn-rescue 通知實際送達）
- [ ] 分享圖片（全部 6 個模板 + Monthly Recap）
- [ ] 頭像上傳（相機 + 相簿）
- [ ] 返回鍵行為（Task 5 驗證清單再跑一次確認真機與模擬器一致）

- [ ] **Step 3: 記錄結果**

若全部通過，Android 技術落地視為完成，可進入「Google Play 上架送審」（第三塊，另開規劃）。若發現問題，回頭修復對應任務後重新驗收。

---

## Self-Review Notes

- **Spec coverage**：spec 列出的 8 個技術缺口（Apple Sign-In/Google Client ID/通知權限/分享驗證/圖示啟動畫面/建置版號腳本/頭像上傳/返回鍵）分別對應 Task 2/3/4/7/8/10/6/5；簽署策略對應 Task 9；模擬器→真機驗證計畫對應每個任務內的手動驗證步驟 + Task 11。CI 決策（不新增）已寫入 Global Constraints，無需獨立任務。
- **Placeholder scan**：所有程式碼步驟均為實際可執行的內容，無 TODO/TBD。
- **Type consistency**：`isIOSPlatform()` 命名在 Task 2 定義後，於 Task 2 的 Step 6 一致使用；`App.addListener` 的 handle 型別（Promise-based `PluginListenerHandle`）在 Task 5 的 cleanup 寫法（`handle.then((h) => h.remove())`）與既有 `AppOpenReset.tsx` 程式碼風格一致。
