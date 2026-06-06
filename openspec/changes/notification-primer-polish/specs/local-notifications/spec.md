## ADDED Requirements

### Requirement: Primer 關閉與權限即時同步

系統 SHALL 確保 Permission Primer 在權限授予後立即關閉，且 SHALL 在 app 回到前台時重新檢查通知權限並同步狀態，以修復「拒絕 → 系統設定開啟 → 回 app」的閉環。

#### Scenario: Primer 授予後立即關閉

WHEN 使用者於 Permission Primer 點擊「開啟提醒」
AND `LocalNotifications.requestPermissions()` 或 `checkPermissions()` 返回 `granted`
THEN 系統 SHALL 透過 `onComplete` callback 通知 `AppOpenReset` 將 `showPrimer` 設為 false
AND Primer 卡片 SHALL 立即關閉
AND 系統 SHALL 啟動通知排程

#### Scenario: Primer 拒絕後保留卡片與引導

WHEN 使用者於 Permission Primer 點擊「開啟提醒」
AND 權限返回 `denied`
THEN 系統 SHALL 顯示引導 Toast
AND Primer 卡片 SHALL 保留（不關閉），讓使用者看到引導

#### Scenario: App 回前台偵測權限變更並同步

WHEN app 從背景回到前台（`App.appStateChange` 的 `isActive` 為 true）
AND `LocalNotifications.checkPermissions()` 返回 `granted`
AND `notifEnabled` 目前為 false
THEN 系統 SHALL 自動設定 `notifEnabled = true`、清除 `notifPermissionDenied`、關閉 Primer（`showPrimer = false`）
AND 系統 SHALL 執行通知重排程

#### Scenario: App 回前台但權限仍未授予

WHEN app 回到前台
AND `checkPermissions()` 返回非 `granted`
THEN 系統 SHALL 不變更通知狀態

#### Scenario: Web 環境不監聽 appStateChange

WHEN 執行環境非 iOS native（`isNativePlatform()` 為 false）
THEN 系統 SHALL NOT 註冊 `App.appStateChange` 監聽
