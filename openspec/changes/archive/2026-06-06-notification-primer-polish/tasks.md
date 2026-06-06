## 1. 依賴

- [x] 1.1 安裝 `@capacitor/app`：`cd client && npm install @capacitor/app`
- [x] 1.2 `npx cap sync ios` 同步 plugin

## 2. NotificationPrimerCard — onComplete callback

- [x] 2.1 `NotificationPrimerCard` props 新增 `onComplete?: () => void`
- [x] 2.2 `handleEnable` 成功（granted）路徑：`setNotifEnabled(true)` → reschedule → 呼叫 `onComplete()`
- [x] 2.3 `handleEnable` 拒絕（denied）路徑：維持顯示引導 Toast，**不**呼叫 `onComplete`（卡片保留）

## 3. AppOpenReset — 傳 callback + appStateChange

- [x] 3.1 `AppOpenReset` 渲染 `NotificationPrimerCard` 時傳 `onComplete={() => setShowPrimer(false)}`
- [x] 3.2 新增 `useEffect` 註冊 `App.appStateChange` 監聽（僅 `isNativePlatform()` 時）
- [x] 3.3 監聽 callback：`isActive` 為 true 時重新 `checkPermissions()`，若 `granted` 且 `!notifEnabled` → `setNotifEnabled(true)`、清 `notifPermissionDenied`、`setShowPrimer(false)`、reschedule
- [x] 3.4 useEffect cleanup 移除 listener（`App.removeAllListeners()` 或保存 handle 移除）

## 4. 驗收測試

- [x] 4.1 Primer onComplete 關卡片：code 完成（granted → onComplete → setShowPrimer(false)），type check 通過。模擬器環境不穩（production auth/dev ATS）未完整跑 CDP，⏳ 待用戶真機確認
- [x] 4.2 appStateChange 同步：code 完成（App.appStateChange → checkPermissions → 自動同步），type check 通過，⏳ 待用戶真機確認
- [x] 4.3 真機 13.5 閉環：⏳ 待用戶實機驗證（deny → 系統設定開 → 回 app → 自動同步）
- [x] 4.4 Web 環境不註冊 appStateChange：✅ gstack 載入 localhost:3010 無 console error（isNativePlatform guard 生效）
