# Android 上架技術落地 — 設計文件

**日期**：2026-09-13
**背景**：Storio 目前僅有 iOS App（Capacitor + Xcode），完全沒有 Android 平台目標（`client/package.json` 無 `@capacitor/android`，無 `android/` 目錄，`docs/DEV_SETUP.md`/`GEMINI.md` 未提及 Android）。使用者已加入 BACKLOG「完成 Android 版本並上架」，透過 brainstorming 拆解為三塊：
1. **前置準備**（非工程，平行進行）：Google Play Developer 帳號（已申請、已付款、審查中）、實體 Android 測試機（尚未取得）
2. **Android 技術落地**（本文件）
3. **Google Play 上架送審**（等技術落地完成、帳號審查通過後另開規劃）

---

## 範圍

**v1 目標**：完整功能對等——iOS 已有的功能都要在 Android 上可用（本機通知、Google 登入、Puppeteer 分享圖片、Apple 相關功能的對應處理）。

**排除**：
- Google Play 上架送審本身（store listing、Data Safety 表單、審核）——第三塊，另開規劃
- 為 Android 新增任何 iOS 沒有的功能

**執行順序**：模擬器優先、逐項修復（已於 brainstorming 確認）——比照 iOS 當初「先模擬器後真機」的兩階段模式，工程進度不被「等 Play 帳號/等真機」卡住。真機到位後做最終驗收，作為送審前的最後關卡而非啟動門檻。

---

## 已知技術缺口（程式碼探勘結果，非推測）

### 1. Apple Sign-In 在 Android 會直接失敗

`client/src/lib/appleAuth.ts`、`googleAuth.ts` 的 `isNativePlatform()` 是 `Capacitor.isNativePlatform()`，iOS 和 Android 上都回傳 `true`。但 `app/page.tsx`、`app/profile/page.tsx` 判斷 `provider === 'apple' && isNativePlatform()` 就呼叫 `nativeAppleSignIn()`，而 `@capacitor-community/apple-sign-in` **只有 iOS 原生實作**——Android 上會直接拋錯。

**修法**：改用 `Capacitor.getPlatform()` 精確判斷平台，Android 上直接隱藏「使用 Apple 登入」選項（Apple 政策不要求 Android 提供 Sign in with Apple）。

### 2. Google 登入缺 Android Client ID

`client/capacitor.config.ts` 的 `GoogleAuth` plugin 只設了 `googleIosClientId`／`googleWebClientId`，沒有 Android 對應的 OAuth Client ID 與 SHA-1 憑證指紋註冊。

**修法**：Google Cloud Console 新增 Android OAuth Client（需要簽署金鑰的 SHA-1，見下方簽署策略），`capacitor.config.ts` 補上 `androidClientId`，`.env.local`/`.env.production` 補對應變數。

### 3. LocalNotifications 邏輯免改，但 Android 原生設定要補

`client/src/lib/notifications.ts` 全部用 Capacitor 官方跨平台 API，TS 邏輯不用動。但：
- Android 13+（API 33+）需要 `AndroidManifest.xml` 宣告 `POST_NOTIFICATIONS` runtime 權限
- 需設定 Notification Channel（`capacitor.config.ts` 已有 `smallIcon`/`iconColor` 設定，但缺對應的 Android drawable 資源）

### 4. Share / Filesystem（分享圖片功能）預期免改，但需實測驗證

`@capacitor/share`、`@capacitor/filesystem` 都是官方跨平台 plugin，理論上免改。iOS 當初也是靠實測才抓到 ATS/CORS 這類平台特有問題（`DEV_SETUP.md` Q7-Q9），Android 上不能只憑書面分析，需要模擬器/真機實測 Puppeteer 分享圖片全鏈路（render → base64 → Filesystem → Share.share）。

### 5. Icon / Splash Screen 完全沒有 Android 資源

iOS 用 `Assets.xcassets`，Android 需要 adaptive icon（foreground/background 圖層，`mipmap-*` 各解析度）與 splash drawable，目前完全沒有對應素材。

### 6. 建置與版號腳本是 iOS 專用

`scripts/build-ios.sh`（暫移 `.env.local` 改用 production 環境變數打包）與 `scripts/bump-version.sh`（改 `.pbxproj` 的 `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`）都是 iOS 專用，需要 Android 對應版本（改 `android/app/build.gradle` 的 `versionName`/`versionCode`）。

### 7. 頭像上傳完全繞過 Capacitor plugin，跨平台行為未知

`app/profile/page.tsx` 與 `components/OnboardingModal.tsx` 的頭像上傳都是原生 `<input type="file" accept="image/*">`，不是走 `@capacitor/camera` 這類官方 plugin。iOS 當初就因為這個踩過真實的 App Store 拒審 crash（缺 `NSCameraUsageDescription`，TCC SIGABRT）。Android 上這個原生 file input 觸發系統相機/相簿選擇器的行為，在不同 WebView 版本與 scoped storage（Android 10+）機制下有已知的相容性坑，需要實測驗證，不能預設「跟 iOS 一樣能動」。

**修法**：模擬器上實測整個頭像上傳流程（相機拍照＋相簿選取兩條路徑），若發現問題再視情況修正（例如改走 `@capacitor/camera` plugin 取代裸 file input）。

### 8. Android 硬體／手勢返回鍵完全沒有處理

`grep backButton` 在整個 `client/src` 是空的——iOS 沒有硬體返回鍵這個概念，所以從未有人寫過相關邏輯。Capacitor App 在 Android 上的預設行為是「返回鍵 = 瀏覽器上一頁，沒有上一頁就直接關閉 App」，對一個 Next.js client-side routing 的 SPA 來說，這通常會導致使用者在某些頁面（例如 Modal 開啟中、表單填寫到一半）按返回鍵時，App 無預警直接退出或产生不符預期的導航跳轉。

**修法**：透過 `@capacitor/app` 的 `App.addListener('backButton', ...)`（`@capacitor/app` 已是既有依賴，不需要新增套件）攔截返回鍵事件，依當前路由狀態決定行為（Modal 開啟中先關 Modal、有上一頁就 `router.back()`、在首頁則走系統預設的退出確認或直接退出）。

---

## 元件與實作計畫

### 元件 1：Capacitor Android 平台加入
- `npm install @capacitor/android`
- `npx cap add android`
- 驗證：`npx cap sync android` 後能在 Android Studio 開啟專案並跑出最小 debug build（先確認能開機、WebView 載入首頁，不用任何功能正常）

### 元件 2：原生登入修正
- 新增 `getPlatform(): 'ios' | 'android' | 'web'` helper（或直接在需要處用 `Capacitor.getPlatform()`）
- Android 上隱藏 Apple 登入 UI（`app/page.tsx`、`app/profile/page.tsx`）
- Google Cloud Console 建立 Android OAuth Client，`capacitor.config.ts` 補 `androidClientId`
- 測試：Android 模擬器驗證 Google 登入完整走完 `signInWithIdToken` 流程

### 元件 3：本機通知 Android 對應設定
- `android/app/src/main/AndroidManifest.xml` 加 `POST_NOTIFICATIONS` 權限宣告
- 補上 notification icon drawable 資源（對應 `capacitor.config.ts` 的 `smallIcon`/`iconColor`）
- 測試：模擬器上驗證 `checkAndRequestPermission()` 跳出系統權限對話框、churn-rescue 排程通知能正確送達

### 元件 4：分享功能驗證
- 模擬器上跑一次完整分享流程（各模板：Default/Pure/Ticket/RetroTV/Shelf/Desk + Monthly Recap）
- 若發現 Android WebView 特有問題（比照 iOS 當初的 CORS/ATS 案例），視情況修正

### 元件 5：Icon / Splash 資源
- 用現有 App Icon 素材產生 Android adaptive icon（foreground/background 圖層）
- Splash screen drawable（沿用純黑 `#0d0d0d` 背景，比照 iOS 設計）

### 元件 6：建置與版號腳本
- 新增 `scripts/build-android.sh`（比照 `build-ios.sh` 的「暫移 `.env.local`、用 production 環境變數打包」邏輯，改為 `npx cap sync android`）
- `scripts/bump-version.sh` 擴充支援 Android（`--sync`/`--build` 模式下同步更新 `android/app/build.gradle` 的 `versionName`/`versionCode`）

### 元件 7：頭像上傳跨平台驗證
- 模擬器上實測 `profile/page.tsx`、`OnboardingModal.tsx` 的頭像上傳（相機拍照＋相簿選取兩條路徑）
- 若原生 file input 在 Android WebView 上有相容性問題，評估改走 `@capacitor/camera` plugin

### 元件 8：Android 返回鍵處理
- 用既有依賴 `@capacitor/app` 的 `App.addListener('backButton', ...)` 攔截返回鍵事件
- 依當前路由/Modal 狀態決定行為：Modal 開啟中先關 Modal、有上一頁歷史就 `router.back()`、在首頁走系統預設退出行為
- 測試：模擬器上逐頁按返回鍵，確認沒有「無預警直接退出 App」或「Modal 開著卻整頁跳轉」的情況

### 元件 7：簽署策略
- 採用 **Play App Signing**（Google 官方推薦）：本地產生 upload keystore 用於簽署上傳的 App Bundle，Google 保管真正的簽署金鑰
- upload keystore 需要妥善備份（遺失需要走 Google 的帳號復原流程），但不像自管金鑰遺失就無法更新 App 那麼致命
- 這把金鑰的 SHA-1 也用於元件 2 的 Google OAuth Android Client 設定

### 元件 8：CI 決策
- **不新增 Android CI**，比照 iOS 現況（手動本地 build + Xcode Archive，無自動化 CI/CD）。理由：現有後端 CI 已是發版安全網第一層，前端/原生打包目前全專案都走手動流程，沒有必要單獨為 Android 破例引入自動化，維持與 iOS 一致的操作心智模型

---

## 測試與驗證計畫

| 階段 | 方式 | 涵蓋範圍 |
|---|---|---|
| 模擬器（Android Studio Emulator） | Chrome Remote Debugging（`chrome://inspect`，對應 iOS 的 CDP 手法） | 元件 1-5 全部逐項驗證 |
| 真機（實體到位後） | Chrome Remote Debugging + 手動走一輪核心動線 | 送審前最終驗收：登入、新增收藏、通知、分享全鏈路 |

驗證比照 iOS 的 `DEV_SETUP.md` Q8/Q9 模式，新增 Android 對應章節記錄除錯手法（模擬器/真機的差異、常見坑）。

---

## 風險與未知

1. **Google Play Developer 帳號審查結果未知**：若審查被拒或需補件，會影響第三塊（上架送審）的時程，但不影響本文件範圍的工程工作
2. **實體測試機尚未取得**：真機驗收會是最後一步的阻塞點，需要使用者自行採購
3. **Puppeteer 分享圖片在 Android WebView 的行為未知**：這是最大的技術不確定性，iOS 當初也是實測才發現多個真實 bug，Android 需要同樣的實測心理準備
4. **頭像上傳（裸 file input）與返回鍵行為都是「理論上會有問題但沒實測過」**：這兩項是本次 brainstorming 追加找到的，屬於「iOS 沒有對應概念、程式碼裡從未考慮過」的類別，優先順序上應該排在模擬器驗證的早期階段，避免後期才發現要大改

---

## Out of Scope（不在本次範圍）
- Google Play 上架素材（store listing、螢幕截圖、Data Safety 表單）
- Android 專屬功能（不新增任何 iOS 沒有的功能）
- Android CI/CD 自動化
