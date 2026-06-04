## MODIFIED Requirements

### Requirement: Settings Display

The system SHALL display the Notifications row in the Profile settings section.
The Notifications row SHALL show the current ON/OFF master toggle state as a badge.
Tapping the Notifications row SHALL navigate to the Notifications sub-page.

The Notifications restriction from the previous spec is lifted.
The system SHALL continue to NOT display Security & Privacy (still incomplete).

#### Scenario: Settings section includes Notifications row

WHEN the user views the Profile page
THEN they SHALL see a "Notifications" row in the PREFERENCE section
AND the row SHALL display an "ON" or "OFF" badge reflecting the master notification toggle state

#### Scenario: Notifications row shows NEW badge after app update

WHEN the user upgrades to v1.14.0 for the first time
AND has never opened the Notifications sub-page
THEN the Notifications row SHALL display a "NEW" badge alongside the ON/OFF badge
AND the badge SHALL disappear after the user visits the sub-page once

#### Scenario: Navigate to Notifications sub-page

WHEN the user taps the Notifications row
THEN the system SHALL navigate to the Notifications sub-page at `/profile/notifications`

---

## ADDED Requirements

### Requirement: Notifications Sub-Page

`/profile/notifications` 子頁面 SHALL 提供：
1. **主開關**（All Notifications）：控制所有 Storio 通知的全域開關
2. **Log a story 開關**：控制記錄提醒類型
3. **Folio reflection 開關**：控制心得提醒類型
4. 不顯示時間選擇器或間隔設定（v1.14.0 hardcoded，UI 隱藏）
5. 不顯示說明文字

#### Scenario: 主開關關閉

WHEN 使用者關閉主開關（All Notifications）
THEN 系統 SHALL 取消所有 pending 本機通知
AND 兩個子類型開關 SHALL 顯示為 disabled 狀態（opacity-40、pointer-events-none）

#### Scenario: 主開關開啟，觸發 iOS 權限請求

WHEN 使用者開啟主開關
AND `LocalNotifications.checkPermissions()` 返回 `prompt`
THEN 系統 SHALL 呼叫 `LocalNotifications.requestPermissions()`

WHEN 使用者開啟主開關
AND `LocalNotifications.checkPermissions()` 返回 `denied`
THEN 系統 SHALL 顯示引導 Toast「請前往 iPhone 設定 > Storio > 通知 開啟」含 [前往設定] 按鈕
AND 主開關 SHALL 維持 OFF 狀態

#### Scenario: 子類型開關獨立控制

WHEN 主開關為 ON
AND 使用者關閉「Folio reflection」開關
THEN 系統 SHALL 只取消 Folio reflection 類型的 pending 通知
AND Log a story 通知不受影響

---

### Requirement: Permission Primer 底部卡片

Permission Primer 為可向下滑關閉的底部卡片（非全屏 modal），顯示於首頁上方。

#### Scenario: Primer 觸發條件

WHEN 使用者已記錄至少一筆 Storio
AND 通知權限尚未授予（`prompt` 或 `denied`）
AND `primer_dismiss_count` < 2
AND 距上次 dismiss ≥ 30 天（或從未 dismiss）
THEN 系統 SHALL 於下次開啟 app 時顯示 Primer

#### Scenario: Primer 不在尚未記錄 Storio 前顯示

WHEN 使用者從未記錄過任何 Storio
THEN 系統 SHALL NOT 顯示 Permission Primer

---

### Requirement: 舊用戶升級後 Banner

非阻斷式 Banner（高度約 56px）顯示於首頁畫面底部，不遮蓋主要內容。

#### Scenario: Banner 觸發

WHEN 使用者為 v1.14.0 之前的既有用戶（`primer_seen` 為 false）
AND 通知權限尚未授予
AND 使用者成功新增一筆 Storio
THEN 系統 SHALL 顯示 Banner：「🔔 開啟提醒，讓記錄變成習慣？」含 [開啟] 和 [✕]

#### Scenario: Banner 最多顯示兩次

WHEN 使用者點擊 [✕] 關閉 Banner
THEN 系統 SHALL 記錄 dismiss，30 天後可再顯示一次
AND 第二次 dismiss 後永不再自動顯示
