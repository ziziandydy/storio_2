## Why

v1.14.0 上線後真機測試發現 Permission Primer 的「Enable Reminders」按鈕在特定流程下無反應，使用者無法從 Primer 開啟通知，且 13.5 的「拒絕 → 系統設定開啟 → 回 app」閉環在真機斷裂。這直接影響通知功能的可用性。

## What Changes

- **修問題 1**：Primer enable 成功（granted）後卡片立即關閉。目前 `handleEnable` 改了 store 但無法關閉卡片（`visible` 是 parent 控制的 prop），使用者看到零回饋。
- **修問題 2**：app 從背景回前台時（例如使用者去 iOS 設定開啟通知後返回），重新檢查權限並自動同步狀態。目前 `checkPermissions()` 不會在回前台時刷新，導致 deny → 系統設定開啟 → 回 app 點 enable 多次無反應。
- 新增 `@capacitor/app` 依賴，使用 `App.appStateChange` 監聽前台事件。
- Primer 取得 `onComplete` callback，由 `AppOpenReset` 控制關閉。

## Capabilities

### Modified Capabilities

- `local-notifications`: 新增「Primer 成功後關閉」與「app 回前台權限同步」兩個行為場景。

## Impact

- **新增依賴**：`@capacitor/app`（`App.appStateChange` 監聽），需 `cap sync ios`
- **修改檔案**：`client/src/components/NotificationPrimerCard.tsx`（onComplete callback）、`client/src/components/AppOpenReset.tsx`（傳 callback + appStateChange 監聽）
- **無後端異動**：純 client-side
- **無 schema 變更**
