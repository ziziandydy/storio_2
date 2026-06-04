## Why

使用者在記錄 Storio 這件事上的主要障礙是「忘記」——看完一部電影或讀完一本書後，沒有任何機制把他們帶回 app。本機通知（Local Notification）透過個人化、不打擾的提醒，在不需要後端推播基礎設施的前提下，讓記錄行為變成習慣。

## What Changes

- 新增兩種本機通知類型，意圖明確分離：**Log a story**（提醒新增典藏）、**Folio reflection**（提醒撰寫心得）
- **App Open Reset 模式**：每次 app 開啟時，讀取最新用戶資料，取消舊通知並重新排程個人化通知
- **行為學習時段**：靜默收集使用者活躍時段（app 開啟 weight 1、記錄 Storio weight 2），7 筆資料後自動找出最佳通知時間，取代固定 hardcoded 時間
- **智慧忽略偵測**：per-trigger 追蹤 ignoredCount，連續 3 次未回應自動停止該觸發路徑；使用者主動行動後重置
- **Permission Primer**：首筆 Storio 記錄後才請求 iOS 通知權限（高投入時刻），搭配說明卡片提升同意率；舊用戶升級後透過非阻斷式 Banner 引導
- 通知內容根據用戶狀態動態組合（username、最後典藏標題、距上次記錄天數、media_type emoji）
- 每日通知上限 2 則，深夜 00:00–08:00 blackout
- 全部排程參數 hardcode，v1.14.0 不開放使用者自行設定時間與間隔
- Profile > Notifications 子頁面：主開關 + 兩個類型開關
- `notification-config.ts`：所有 hardcoded 參數的單一文件來源，含完整 JSDoc

## Capabilities

### New Capabilities

- `local-notifications`：本機通知排程、個人化內容組合、App Open Reset 邏輯、行為學習時段（Behavioral Timing）、智慧忽略偵測（Smart Ignore Detection）、Permission Primer 與舊用戶 Banner、每日上限管控、通知設定 UI（Profile 子頁面）

### Modified Capabilities

- `profile-settings`：Profile 頁面「設定」區塊新增 Notifications row（顯示 ON/OFF 狀態，升級後顯示 NEW badge）

## Impact

- **新增依賴**：`@capacitor/local-notifications`（iOS 需加入 Info.plist 通知權限說明）
- **新增檔案**：
  - `client/src/lib/notification-config.ts`（參數文件）
  - `client/src/lib/notifications.ts`（核心邏輯：排程、行為學習、忽略偵測）
  - `client/src/app/profile/notifications/page.tsx`（設定子頁面）
  - `client/src/components/NotificationPrimerCard.tsx`（新用戶權限請求卡片）
  - `client/src/components/NotificationBanner.tsx`（舊用戶升級 Banner）
- **修改檔案**：
  - `client/src/app/profile/page.tsx`（新增 Notifications row + NEW badge）
  - `client/src/store/settingsStore.ts`（擴充通知狀態欄位）
  - `client/capacitor.config.ts`（LocalNotifications plugin 設定）
  - `client/src/i18n/locales.ts`（通知相關 i18n 字串）
  - `client/src/app/layout.tsx`（App Open Reset + recordEngagement 整合）
  - `client/src/components/AddToFolioModal.tsx`（recordEngagement + Banner 觸發）
- **iOS**：Xcode 加入 `NSUserNotificationUsageDescription`、cap sync
- **無後端異動**：完全 client-side，不觸及 FastAPI 或 Supabase schema
