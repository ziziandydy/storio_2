## 1. 依賴安裝與 iOS 設定

- [x] 1.1 安裝 `@capacitor/local-notifications`：`cd client && npm install @capacitor/local-notifications`
- [x] 1.2 `capacitor.config.ts` 加入 `LocalNotifications` plugin 設定（smallIcon、iconColor）
- [x] 1.3 執行 `npx cap sync ios` 同步 plugin 至 Xcode
- [x] 1.4 ~~Xcode `Info.plist` 加入 `NSUserNotificationUsageDescription`~~ → **不需要**。經查證 iOS local notifications 透過 `UNUserNotificationCenter.requestAuthorization()` 動態請求權限（已由 `checkAndRequestPermission()` 處理），系統對話框文字由 iOS 提供。`NSUserNotificationUsageDescription` 為 macOS key，iOS 不讀取；plugin README 僅要求 Android 加 manifest 權限。

## 2. 通知參數文件（notification-config.ts）

- [x] 2.1 建立 `client/src/lib/notification-config.ts`，定義 `NOTIFICATION_CONFIG` const 物件，包含所有 hardcoded 參數：`LOG_STORY_INTERVAL_DAYS`、`LOG_STORY_FALLBACK_HOUR/MINUTE`、`FOLIO_REFLECTION_INTERVAL_DAYS`、`FOLIO_REFLECTION_FALLBACK_HOUR/MINUTE`、`MAX_PER_DAY`、`BLACKOUT_START/END_HOUR`、`UNRATED_RECENT_WINDOW_DAYS`、`UNRATED_COOLDOWN_DAYS`、`IGNORE_THRESHOLD`、`MIN_DATA_POINTS_FOR_LEARNING`、`ENGAGEMENT_HISTORY_MAX`、`STORY_CREATE_WEIGHT`、`PEAK_EVENING_START/END`、`PEAK_MORNING_START/END`、`PRIMER_DISMISS_COOLDOWN_DAYS`、`PRIMER_MAX_DISMISS_COUNT`
- [x] 2.2 在 `notification-config.ts` 加入 `MESSAGE_VARIANTS` 物件，中英文各 6 條 fallback 訊息
- [x] 2.3 為每個參數加入完整 JSDoc（用途、調整影響、未來開放 UI 設定時的對應 Settings key）

## 3. 行為學習時段（notifications.ts 核心）

- [x] 3.1 建立 `client/src/lib/notifications.ts`，export `notificationManager` 物件
- [x] 3.2 實作 `recordEngagement(weight: number)`：將 `{ hour: currentHour, weight }` 加入 localStorage `storio_notif_engagement_history`，超過 `ENGAGEMENT_HISTORY_MAX` 時移除最舊一筆
- [x] 3.3 實作 `getOptimalHour(type: 'log_story' | 'folio_reflection'): number`：計算加權 peak hour，資料不足時返回 fallback，優先選晚間峰值，blackout 時段推延至 08:00
- [x] 3.4 確認 `recordEngagement(2)` 在使用者成功儲存 Storio 時被呼叫（`collection/item/page.tsx` 或 `AddToFolioModal`）
- [x] 3.5 確認 `recordEngagement(1)` 在 App Open Reset 時（`layout.tsx` useEffect）被呼叫

## 4. 智慧忽略偵測（notifications.ts）

- [x] 4.1 定義各 trigger 的狀態結構：`{ ignoredCount: number, lastSentAt: number | null }`，以 `storio_notif_trigger_<name>` 為 key 存入 localStorage
- [x] 4.2 實作 `incrementIgnoredCount(trigger)`：下次 App Open Reset 時，若用戶自上次通知後未行動，ignoredCount +1
- [x] 4.3 實作 `resetIgnoredCount(trigger)`：重置指定 trigger 的 ignoredCount 為 0
- [x] 4.4 在使用者評分任一作品時呼叫 `resetIgnoredCount('folio_reflection')`
- [x] 4.5 在使用者新增典藏時呼叫 `resetIgnoredCount('log_story')`
- [x] 4.6 排程邏輯中，若 `ignoredCount >= IGNORE_THRESHOLD` 則跳過對應觸發路徑

## 5. 通知排程邏輯（notifications.ts）

- [x] 5.1 實作 `checkAndRequestPermission(): Promise<boolean>`：呼叫 `checkPermissions()` / `requestPermissions()`，返回是否授予
- [x] 5.2 實作 `buildNotificationContent(trigger, state): NotificationContent`：依 Log a story 優先順序（天數 > fallback）與 Folio reflection 優先順序（未評分 > 心得天數 > fallback）組出個人化標題/body，依語系選擇文字
- [x] 5.3 實作 `reschedule(state)`：取消現有 Storio pending 通知 → 對各 trigger 判斷冷卻/ignoredCount/間隔 → 呼叫 `getOptimalHour()` 計算時間 → 排程最多 `MAX_PER_DAY` 則通知 → 更新 `lastSentAt`
- [x] 5.4 實作 `cancelAll()`：取消所有 Storio 管理的 pending 通知
- [x] 5.5 確認 Folio reflection 未評分觸發只針對 `UNRATED_RECENT_WINDOW_DAYS` (14 天) 內加入的收藏，且 `lastSentAt` 距今 > `UNRATED_COOLDOWN_DAYS` (7 天)

## 6. App Open Reset 整合

- [x] 6.1 在 `client/src/app/layout.tsx` 的 `useEffect` 加入 App Open Reset：`recordEngagement(1)` → 讀取 collection API → `notificationManager.reschedule(state)`
- [x] 6.2 確認 App Open Reset 僅在 `isNativePlatform()` 為 true 時執行
- [x] 6.3 使用 `storio_notif_last_scheduled` 防止同一天重複全量重排程（設定有變更時例外）

## 7. 狀態管理（settingsStore 擴充）

- [x] 7.1 `settingsStore.ts` 新增欄位：`notifEnabled`（false）、`notifLogStory`（true）、`notifFolioReflection`（true）、`notifPermissionDenied`（false）、`notifPrimerDismissCount`（0）、`notifPrimerLastDismissedAt`（null）、`notifPrimerSeen`（false）
- [x] 7.2 確認上述欄位持久化至 localStorage（Zustand persist）

## 8. i18n 字串

- [x] 8.1 `locales.ts` 新增 `notifications` 區塊：`title`、`allNotifications`、`allNotificationsDesc`、`logStory`、`logStoryDesc`、`folioReflection`、`folioReflectionDesc`、`permissionDeniedToast`、`permissionDeniedSettings`（中英文）
- [x] 8.2 `locales.ts` 新增 Permission Primer 文字：`primerTitle`（從不錯過一個故事）、`primerBody`（幾天沒有記錄時，我們會輕輕提醒你）、`primerCTA`（開啟提醒）、`primerDismiss`（之後再說）
- [x] 8.3 `locales.ts` 新增舊用戶 Banner 文字：`bannerText`（🔔 開啟提醒，讓記錄變成習慣？）

## 9. Permission Primer 底部卡片

- [x] 9.1 建立 `client/src/components/NotificationPrimerCard.tsx`：底部滑入卡片，含標題、說明、[開啟提醒]、[之後再說]
- [x] 9.2 點擊 [開啟提醒] → 呼叫 `checkAndRequestPermission()` → 授予則關閉卡片並啟動排程，拒絕則 Toast 引導
- [x] 9.3 點擊 [之後再說] 或向下滑 → `notifPrimerDismissCount++`，若 >= 2 則永不再顯示
- [x] 9.4 在 `layout.tsx` 加入觸發邏輯：已記錄 ≥ 1 筆 Storio、權限未授予、dismissCount < 2、cooldown 已過 → 顯示 Primer

## 10. 舊用戶升級 Banner

- [x] 10.1 建立 `client/src/components/NotificationBanner.tsx`：非阻斷式底部 Banner（56px），含文字、[開啟]、[✕]
- [x] 10.2 觸發條件：`notifPrimerSeen` 為 false、權限未授予、使用者剛新增 Storio 成功
- [x] 10.3 [開啟] → 導向 `/profile/notifications`；[✕] → 記錄 dismiss，30 天後可再顯示一次（最多一次）
- [x] 10.4 在 `AddToFolioModal` 或 `collection/item/page.tsx` 的儲存成功 callback 加入 Banner 顯示邏輯

## 11. Notifications 子頁面 UI

- [x] 11.1 建立 `client/src/app/profile/notifications/page.tsx`
- [x] 11.2 實作頁面 header（返回按鈕 + 標題）+ 動態島遮罩
- [x] 11.3 實作「All Notifications」主開關區塊（bell icon）：開啟時觸發權限請求流程
- [x] 11.4 實作「WHAT TO REMIND YOU ABOUT」區塊：Log a story + Folio reflection 兩個 toggle row
- [x] 11.5 主開關 OFF 時，子開關顯示 disabled 樣式（opacity-40、pointer-events-none）
- [x] 11.6 iOS 權限被拒時顯示 Toast 含 [前往設定] 按鈕（`Capacitor.openURL('app-settings:')`）

## 12. Profile 主頁整合

- [x] 12.1 `profile/page.tsx` PREFERENCE 區塊加入 Notifications row（bell icon、ON/OFF badge）
- [x] 12.2 Notifications row 點擊導向 `/profile/notifications`
- [x] 12.3 升級後首次進入，Notifications row 顯示「NEW」徽章，進入子頁面後消失

## 13. 驗收測試

- [x] 13.1 新用戶流程：記錄第一筆 Storio → 下次開 app → Permission Primer 出現（真機驗證，含修復 collectionCount 觸發 bug）
- [x] 13.2 Primer dismiss × 2 次 → 不再自動出現（真機驗證，dismissCount 0→1→2 後不顯示）
- [x] 13.3 舊用戶流程：新增 Storio → Banner 出現（真機驗證 story-added 事件觸發 Banner）
- [x] 13.4 開啟主開關 → iOS 通知權限對話框出現（真機驗證，系統對話框「Storio 想要傳送通知」）
- [x] 13.5 iOS 拒絕後引導：web 環境已驗證 GO TO SETTINGS 引導；真機因已 granted 無法重現 deny
- [x] 13.6 `getPending()` 驗證：folio_reflection 排程，body「《後室》給你什麼感悟？🌙」內容正確
- [x] 13.7 engagement < 7 筆 → fallback 時間（驗證 20:00 = UTC 00:00 次日）
- [x] 13.8 早晨峰值 → 09:00（node 演算法驗證，getOptimalHour 加權峰值）
- [x] 13.9 folio_reflection ignoredCount 達 3 → getPending 回 []（真機驗證）
- [x] 13.10 評分後 → ignoredCount 重置 3→0（真機驗證）
- [x] 13.11 關閉 folio_reflection 開關 → getPending 回 []（真機驗證）
- [x] 13.12 每日上限：2 種類型 × MAX_PER_DAY=2，L290 守衛 `toSchedule.length < MAX_PER_DAY` 確保不超過（邏輯驗證）
- [x] 13.13 Web 環境不觸發排程（`isNativePlatform()` 判斷，web 驗證）
- [x] 13.14 語系切換 en-US → 通知文字「What did you think of "後室"? 🌙」（真機驗證）
