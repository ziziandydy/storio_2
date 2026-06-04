## Context

Storio 是一個 Capacitor iOS app（Next.js + Capacitor）。目前沒有任何通知基礎設施：無 `@capacitor/local-notifications`、無 push token 儲存、無後端排程。

使用者記錄 Storio 的主要障礙是忘記——app 沒有任何機制在使用者完成觀賞後將其帶回。

## Goals / Non-Goals

**Goals:**
- 實作兩種本機通知：Log a story（記錄提醒）、Folio reflection（心得提醒），意圖明確分離
- App Open Reset 模式：每次 app 開啟時重新排程個人化通知
- 行為學習時段：靜默收集使用者活躍時段，自動找出最佳通知時間
- 智慧忽略偵測：感知使用者「不想回應」的行為，自動停止該觸發路徑
- Permission Primer：在高投入時刻（首次記錄後）才請求 iOS 通知權限，提升同意率
- Profile > Notifications 子頁面：主開關 + 兩個類型開關
- `notification-config.ts`：所有 hardcoded 參數的單一文件來源
- 每日通知上限 2 則，00:00–08:00 blackout

**Non-Goals:**
- v1.14.0 不開放使用者自行設定時間與通知間隔（UI 隱藏，參數 hardcoded）
- Push Notification（APNs / FCM / n8n）— 留待 v1.15.x
- 後端 device token 儲存或 server-side 觸發
- Android 支援（Storio 目前僅 iOS）
- 通知深連結（點通知直接開啟新增頁）— 留待後續版本

## Decisions

### 1. Local Notification + App Open Reset（而非 Push）

**選擇**：`@capacitor/local-notifications` + 每次 app 開啟時重新排程。

**理由**：零後端需求，足以覆蓋核心用例（有在用 app 但忘記記錄）。通知內容在排程時注入，確保個人化資料是最新狀態。Push 只有在使用者完全停用 app 時才有優勢，留待 v1.15.x。

**替代方案捨棄**：Push Notification 需要 APNs 憑證、後端 device token 表、n8n workflow，工程量 10×，v1.14.0 用戶基數尚小，無法驗證 ROI。

### 2. 通知內容在 App 開啟時即時組合

每次 app 開啟 → 讀取最新資料 → 組出個人化文字 → 取消舊通知 → 重新排程。

```
App 開啟（layout.tsx useEffect）
  ↓
recordEngagement(1)               // 記錄活躍時段
notificationManager.reschedule({  // 讀取用戶狀態
  username, lastTitle, lastMediaType,
  daysSinceLastLog, collectionCount,
  hasUnratedItemsWithin14Days
})
  ↓
getOptimalHour() → 計算最佳排程時間
buildNotificationContent(state)   // 選模板、填資料
  ↓
LocalNotifications.cancel(pendingIds)
LocalNotifications.schedule(newNotifications)
```

**為何不預先排程 30 天？** iOS 最多 64 則 pending，且內容隨用戶狀態改變；重新排程確保內容永遠準確。

### 3. 行為學習時段（Behavioral Timing Learning）

**問題**：固定 21:00 無法適配所有使用者，早起看書的人應在早晨收到通知。

**選擇**：靜默收集 app 開啟時段（weight 1）與 Storio 記錄時段（weight 2），保留最近 21 筆，計算加權峰值 hour，資料 ≥ 7 筆後自動切換排程時間。

```
engagement_history = [{ hour, weight }, ...]  // max 21 筆，滑動窗口

getOptimalHour():
  if history.length < MIN_DATA_POINTS_FOR_LEARNING(7):
    return FALLBACK_HOUR  // 21 或 20
  freq = 計算各 hour 的加權頻率
  優先選 PEAK_EVENING(18-23) 峰值
  次選 PEAK_MORNING(8-13) 峰值
  blackout(0-8) 時段推延至 08:00
```

**為何 Storio 記錄用 weight 2？** 記錄行為是「有空且願意行動」的強信號，比單純開 app 更能代表最佳提醒時機。

**替代方案捨棄**：onboarding 問用戶習慣時間 → 增加摩擦，且用戶自我報告不如行為資料準確。

### 4. 智慧忽略偵測（Smart Ignore Detection）

**問題**：「未評分收藏」觸發器無法區分「忘記」vs「故意不評分」，重複提醒會製造噪音。

**選擇**：per-trigger `ignoredCount`，連續 3 次收到通知但未行動 → 停止該觸發路徑；使用者主動行動時重置。

同時加入「未評分觸發」的兩道過濾：
1. 只針對 14 天內加入的收藏（舊的未評分 = 使用者已放棄）
2. 每次觸發後 7 天冷卻（最多每週一次）

**替代方案捨棄**：通知 action button「略過此提醒」→ 增加 UI 複雜度，且 iOS 通知 action 需額外 capability 設定。

### 5. Hardcoded 參數集中在 notification-config.ts

所有魔法數字集中於 `notification-config.ts`，含完整 JSDoc，未來開放 UI 設定時只需讀取此 config。參數涵蓋：間隔天數、fallback 時間、blackout、行為學習閾值、忽略偵測閾值、Primer 冷卻天數。

### 6. 通知狀態儲存在 localStorage（非 Supabase）

通知開關、engagement history、ignoredCount、Primer dismiss 狀態均屬 device-level，不需跨裝置同步。使用 Zustand persist 擴充 `settingsStore`。

完整 key schema：
```
storio_notif_enabled                    // 主開關
storio_notif_log_story                  // Log a story 開關
storio_notif_folio_reflection           // Folio reflection 開關
storio_notif_last_scheduled             // 防重複排程 timestamp
storio_notif_engagement_history         // [{ hour, weight }] 行為學習資料
storio_notif_trigger_log_story          // { ignoredCount, lastSentAt }
storio_notif_trigger_folio_reflection   // { ignoredCount, lastSentAt }
storio_notif_primer_dismiss_count       // Permission Primer dismiss 次數
storio_notif_primer_last_dismissed_at   // 上次 dismiss timestamp
storio_notif_primer_seen               // 是否曾看過 Primer（舊用戶判斷）
```

### 7. Permission Primer：在高投入時刻請求，而非 Cold Ask

**iOS 通知權限是一次性的**：拒絕後 app 永遠不能再請求，只能引導至設定。Cold ask（冷啟動立即請求）同意率約 40-50%；Primer（先說明價值再請求）同意率約 60-70%。

**新用戶**：記錄第一筆 Storio 後 → 下次開 app 顯示 Permission Primer 底部卡片（說明好處 + iOS 對話框）。
**舊用戶（升級）**：新增 Storio 成功後，顯示非阻斷式 Banner → 引導進入 Notifications 設定頁。

兩種情境均有 dismiss 計數：最多顯示兩次，之後不再主動打擾。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| 使用者從不開 app，通知永遠不重排程 | v1.15.x 補 n8n Push Notification 覆蓋此場景 |
| iOS 可能在背景清除 pending 通知 | 每次 app 開啟必做重排程，確保通知存在 |
| 行為學習前 7 筆資料累積需時 | 新用戶 fallback 到固定時間，體驗仍完整；約一週後自動個人化 |
| engagement history 資料在清除 app 快取時消失 | 重新開始學習即可，非核心功能，不需備份 |
| ignoredCount 邏輯複雜，難以測試 | 透過 localStorage mock 模擬計數，Task 13 有完整驗收情境 |
| iOS 拒絕通知權限後用戶流失 | Primer 設計先說明價值再請求，並提供清楚的 Settings 引導路徑 |
| Primer 在 web 環境執行 | 所有通知相關邏輯均以 `isNativePlatform()` 條件隔離 |

## Migration Plan

1. 安裝 `@capacitor/local-notifications`，升級 iOS deployment target 至 15.0，執行 `cap sync ios`
2. （iOS 通知權限由 `UNUserNotificationCenter` 動態請求，無需 Info.plist usage description）
3. 新增 `notification-config.ts`（參數文件）、`notifications.ts`（核心邏輯）
4. `settingsStore` 擴充通知相關欄位
5. 新增 `NotificationPrimerCard`、`NotificationBanner` 元件
6. 新增 `/profile/notifications` 子頁面
7. Profile 主頁加入 Notifications row + NEW badge
8. `layout.tsx` 加入 App Open Reset + `recordEngagement(1)`
9. Storio 記錄成功 callback 加入 `recordEngagement(2)` + Banner 觸發

不需要 DB migration。無 breaking change。

## Open Questions

- 通知文字最終版（中文 / 英文）由產品確認後定案，目前 spec 中為草稿
- v1.15.x Push Notification 啟動條件（幾天無開 app？）留待下版規劃
