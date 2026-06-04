## ADDED Requirements

---

### Requirement: Notification Config

`client/src/lib/notification-config.ts` 為唯一的 hardcoded 參數來源。所有通知邏輯均從此讀取常數，禁止在其他檔案散落魔法數字。

參數清單：
- `LOG_STORY_INTERVAL_DAYS` (3)
- `LOG_STORY_FALLBACK_HOUR` (21)、`LOG_STORY_FALLBACK_MINUTE` (0)
- `FOLIO_REFLECTION_INTERVAL_DAYS` (7)
- `FOLIO_REFLECTION_FALLBACK_HOUR` (20)、`FOLIO_REFLECTION_FALLBACK_MINUTE` (0)
- `MAX_PER_DAY` (2)
- `BLACKOUT_START_HOUR` (0)、`BLACKOUT_END_HOUR` (8)
- `UNRATED_RECENT_WINDOW_DAYS` (14)
- `UNRATED_COOLDOWN_DAYS` (7)
- `IGNORE_THRESHOLD` (3)
- `MIN_DATA_POINTS_FOR_LEARNING` (7)
- `ENGAGEMENT_HISTORY_MAX` (21)
- `STORY_CREATE_WEIGHT` (2)
- `PEAK_EVENING_START` (18)、`PEAK_EVENING_END` (23)
- `PEAK_MORNING_START` (8)、`PEAK_MORNING_END` (13)
- `PRIMER_DISMISS_COOLDOWN_DAYS` (30)
- `PRIMER_MAX_DISMISS_COUNT` (2)

每個參數 SHALL 附 JSDoc 說明：用途、調整影響、未來開放 UI 設定時對應的 Settings key。

#### Scenario: Config 為唯一真實來源

WHEN 任何模組需要通知相關常數
THEN 該模組 SHALL import `NOTIFICATION_CONFIG` from `notification-config.ts`，不得在其他位置宣告相同常數

---

### Requirement: Behavioral Timing Learning

系統 SHALL 靜默收集使用者的活躍時段，學習最佳通知時間，無需使用者手動設定。

#### Scenario: 記錄參與時段

WHEN 使用者開啟 app
THEN 系統 SHALL 呼叫 `recordEngagement(1)`，將當下 hour 存入 engagement history（權重 1）

WHEN 使用者成功記錄一筆 Storio
THEN 系統 SHALL 呼叫 `recordEngagement(2)`，將當下 hour 存入 engagement history（權重 2）

#### Scenario: 滑動窗口維護

WHEN engagement history 超過 `ENGAGEMENT_HISTORY_MAX` (21) 筆
THEN 系統 SHALL 移除最舊的一筆，保持不超過上限

#### Scenario: 資料不足時使用 fallback

WHEN engagement history 筆數 < `MIN_DATA_POINTS_FOR_LEARNING` (7)
THEN `getOptimalHour()` SHALL 返回對應類型的 fallback 時間（Log a story: 21、Folio reflection: 20）

#### Scenario: 資料充足時使用學習時段

WHEN engagement history 筆數 ≥ `MIN_DATA_POINTS_FOR_LEARNING`
THEN `getOptimalHour()` SHALL：
  1. 統計加權後各 hour 的出現頻率
  2. 優先選取 `PEAK_EVENING_START`–`PEAK_EVENING_END`（18–23）範圍內的峰值 hour
  3. 若晚間無峰值，選取 `PEAK_MORNING_START`–`PEAK_MORNING_END`（8–13）範圍內的峰值
  4. 若皆無，返回 fallback

#### Scenario: Blackout 強制推延

WHEN `getOptimalHour()` 返回的時間落在 `BLACKOUT_START_HOUR`–`BLACKOUT_END_HOUR`（00–08）
THEN 排程時間 SHALL 推延至 `BLACKOUT_END_HOUR`:00

---

### Requirement: App Open Reset

每次 app 進入前台時，`notificationManager.reschedule()` SHALL 被呼叫一次。

#### Scenario: 正常重排程流程

WHEN app 開啟且使用者已開啟主通知開關
THEN 系統 SHALL 依序執行：
  1. 呼叫 `recordEngagement(1)` 記錄當下時段
  2. 呼叫 `LocalNotifications.getPending()` 取得現有通知
  3. 取消所有 Storio 管理的 pending 通知
  4. 讀取用戶最新資料（last story title、last media_type、days since last log、collection count、has unrated items within 14 days）
  5. 呼叫 `getOptimalHour()` 計算各類型排程時間
  6. 依觸發條件與 ignoredCount / lastSentAt 決定是否排程各類通知
  7. 排程最多 `MAX_PER_DAY` 則通知
  8. 更新 `storio_notif_last_scheduled` timestamp

#### Scenario: 通知權限未授予

WHEN 重排程時 `LocalNotifications.checkPermissions()` 返回非 `granted`
THEN 系統 SHALL 跳過排程並在 settingsStore 標記 `notifPermissionDenied: true`

#### Scenario: 主開關關閉

WHEN `storio_notif_enabled` 為 `false`
THEN 系統 SHALL 取消所有 pending 通知並跳過排程

---

### Requirement: Log a Story 通知

#### Scenario: 距上次記錄超過間隔

WHEN 距上次 `created_at` > `LOG_STORY_INTERVAL_DAYS` (3) 天
AND `storio_notif_log_story` 為 `true`
AND `log_story.ignoredCount` < `IGNORE_THRESHOLD` (3)
THEN 系統 SHALL 排程一則 Log a story 通知於 `getOptimalHour('log_story')` 時間

#### Scenario: 個人化內容組合

WHEN 組合 Log a story 通知內容
THEN 系統 SHALL 使用：`「{name}，{N} 天沒有新典藏了 {emoji}」`
AND emoji 依 last media_type 選擇：movie → 🎬、book → 📚、tv → 📺
AND 若無上述資料則從 `MESSAGE_VARIANTS` 隨機選一條

#### Scenario: 間隔未達不排程

WHEN 距上次記錄 ≤ `LOG_STORY_INTERVAL_DAYS`
THEN 系統 SHALL 不排程 Log a story 通知

#### Scenario: 新增典藏重置忽略計數

WHEN 使用者成功新增一筆 Storio
THEN 系統 SHALL 重置 `log_story.ignoredCount = 0`

---

### Requirement: Folio Reflection 通知

#### Scenario: 未評分主觸發

WHEN 14 天內有未評分收藏（`created_at` 在 `UNRATED_RECENT_WINDOW_DAYS` 內）
AND `folio_reflection.lastSentAt` 距今 > `UNRATED_COOLDOWN_DAYS` (7) 天
AND `folio_reflection.ignoredCount` < `IGNORE_THRESHOLD` (3)
AND `storio_notif_folio_reflection` 為 `true`
THEN 系統 SHALL 排程一則 Folio reflection 通知於 `getOptimalHour('folio_reflection')` 時間

#### Scenario: 距上次心得次觸發

WHEN 未評分主觸發不成立
AND 距上次 `notes` 更新 > `FOLIO_REFLECTION_INTERVAL_DAYS` (7) 天
AND `storio_notif_folio_reflection` 為 `true`
THEN 系統 SHALL 排程一則 Folio reflection 通知

#### Scenario: 個人化心得內容

WHEN 組合 Folio reflection 通知內容
THEN 系統 SHALL 優先使用：`「《{lastTitle}》給你什麼感悟？🌙」`
AND 若無最近作品則使用 fallback

#### Scenario: 評分重置忽略計數

WHEN 使用者主動對任一作品評分
THEN 系統 SHALL 重置 `folio_reflection.ignoredCount = 0`

---

### Requirement: 智慧忽略偵測

每個觸發類型在 localStorage 各自維護 `ignoredCount` 與 `lastSentAt`。

#### Scenario: 連續忽略停止觸發

WHEN 某觸發類型已排程通知 N 次
AND 使用者每次收到後均未執行對應行動（未評分 / 未新增典藏）
AND N ≥ `IGNORE_THRESHOLD` (3)
THEN 系統 SHALL 停止排程此觸發路徑直到計數重置

#### Scenario: ignoredCount 遞增

WHEN 系統排程一則通知
THEN 系統 SHALL 在下次 App Open Reset 時，若用戶尚未行動，將對應 trigger 的 `ignoredCount` +1

---

### Requirement: 每日上限與 Blackout

#### Scenario: 達到每日上限

WHEN 計算出需排程的通知數 > `MAX_PER_DAY` (2)
THEN 系統 SHALL 依優先順序（Log a story > Folio reflection）保留前 2 則

#### Scenario: Blackout 時段

WHEN 計算出的排程時間落在 00:00–08:00
THEN 系統 SHALL 將排程時間推延至 08:00

---

### Requirement: 通知訊息變體

系統 SHALL 維護 6 條 fallback 訊息，中英文各一套，根據 `settingsStore.language` 選擇。

中文：「今天是記錄新故事的好時機 📚」、「你的 Folio 在等待新的故事」、「花 30 秒，讓記憶留下來」、「最近有看到什麼值得典藏的嗎？」、「記錄才能讓故事真正屬於你 ✨」、「今晚，為你的 Folio 添一筆」

英文：「Time to capture a new story 📚」、「Your Folio is waiting for its next chapter」、「30 seconds to preserve a memory」、「Seen anything worth archiving lately?」、「Stories are only yours when you collect them ✨」、「Tonight, add a story to your Folio」

#### Scenario: 語系對應

WHEN `settingsStore.language` 為 `zh-TW`
THEN 系統 SHALL 使用中文變體池

WHEN `settingsStore.language` 為 `en-US`
THEN 系統 SHALL 使用英文變體池

---

### Requirement: Permission Primer — 新用戶

#### Scenario: 首筆 Storio 後次次開 app 顯示 Primer

WHEN 使用者已記錄至少一筆 Storio
AND 通知權限尚未授予
AND `primer_dismiss_count` < `PRIMER_MAX_DISMISS_COUNT` (2)
AND 距上次 dismiss > `PRIMER_DISMISS_COOLDOWN_DAYS` (30) 天（或從未 dismiss）
THEN 系統 SHALL 於下次開啟 app 時顯示 Permission Primer 底部卡片

#### Scenario: Primer 卡片內容

WHEN Permission Primer 顯示
THEN 卡片 SHALL 包含：標題「從不錯過一個故事」、說明文字「幾天沒有記錄時，我們會輕輕提醒你」、[開啟提醒] 主按鈕、[之後再說] 次要按鈕

#### Scenario: 使用者點「開啟提醒」

WHEN 使用者點擊 [開啟提醒]
THEN 系統 SHALL 呼叫 `LocalNotifications.requestPermissions()`
AND 若授予 → 啟動排程，Primer 消失，不再顯示
AND 若拒絕 → 顯示 Toast 引導至 iOS 設定，Primer 消失

#### Scenario: 使用者 dismiss Primer

WHEN 使用者點擊 [之後再說] 或向下滑關閉
THEN 系統 SHALL 將 `primer_dismiss_count` +1
AND 若 `primer_dismiss_count` >= 2 → 永不再自動顯示 Primer
AND 若 `primer_dismiss_count` == 1 → 30 天後可再顯示一次

---

### Requirement: Permission Primer — 舊用戶（升級後）

#### Scenario: 升級後首次新增 Storio 顯示 Banner

WHEN 使用者從未看過 Primer（`primer_seen` 為 false）
AND 通知權限尚未授予
AND 使用者成功新增一筆 Storio
THEN 系統 SHALL 於儲存成功後顯示非阻斷式底部 Banner：
  「🔔 開啟提醒，讓記錄變成習慣？」+ [開啟] + [✕]

#### Scenario: Banner 互動

WHEN 使用者點擊 [開啟]
THEN 系統 SHALL 導向 Profile > Notifications 子頁面 → 觸發 iOS 權限請求

WHEN 使用者點擊 [✕]
THEN Banner 消失，30 天後可再出現一次（最多一次）

---

### Requirement: iOS 通知權限引導

#### Scenario: 權限已被拒、使用者嘗試開啟主開關

WHEN 使用者在 Notifications 子頁面開啟主開關
AND `LocalNotifications.checkPermissions()` 返回 `denied`
THEN 系統 SHALL 顯示引導 Toast：「請前往 iPhone 設定 > Storio > 通知 開啟」含 [前往設定] 按鈕
AND 主開關 SHALL 維持 OFF 狀態

#### Scenario: 使用者從 iOS 設定開啟後返回 app

WHEN 使用者從 iOS 設定開啟通知並返回 app
THEN 系統 SHALL 於 App Open Reset 時偵測到 `granted`
AND 若 `notifEnabled` 為 false → 自動切換為 true 並啟動排程
