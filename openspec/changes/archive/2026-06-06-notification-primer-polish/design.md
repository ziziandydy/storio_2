## Context

v1.14.0 的 Permission Primer（`NotificationPrimerCard`）由 `AppOpenReset` 以 `showPrimer` state 控制顯示（`visible` prop）。`handleEnable` 在卡片內部執行權限請求與 store 更新，但**無法改 parent 的 `showPrimer`**，因此 enable 成功後卡片不消失。

此外，iOS 通知權限可在系統設定被外部改變（使用者離開 app 去設定開啟）。Capacitor WebView 的 `checkPermissions()` 不會在 app 回前台時自動刷新，需主動監聽 `appStateChange` 重新檢查。

## Goals / Non-Goals

**Goals:**
- Primer enable 成功後立即關閉卡片
- app 回前台時偵測權限變更，granted 則自動同步並排程
- 修復 13.5 真機閉環

**Non-Goals:**
- 不改動 Primer 的觸發條件（collectionCount / dismiss 邏輯）
- 不改後端
- 不處理 Android（Storio 僅 iOS）

## Decisions

### 1. Primer 用 onComplete callback 上拋，由 parent 關閉

**選擇**：`NotificationPrimerCard` 接收 `onComplete: () => void`，handleEnable 成功（granted）或在某些終態時呼叫，`AppOpenReset` 收到後 `setShowPrimer(false)`。

**理由**：state 提升原則。卡片顯示由 parent 擁有，關閉也該由 parent 執行。子元件透過 callback 通知，不直接操作 parent state。

**替代方案捨棄**：把 showPrimer 改成全域 store。過度設計，Primer 顯示是 view-local 狀態，不需跨元件共享。

### 2. App.appStateChange 監聽放在 AppOpenReset

**選擇**：在 `AppOpenReset`（已掛於 layout、生命週期與 app 一致）加 `App.appStateChange` 監聽。app 變為 active（`isActive: true`）時：
1. 重新 `checkPermissions()`
2. 若 `granted` 且 `notifEnabled` 為 false → 自動 `setNotifEnabled(true)`、清 `notifPermissionDenied`、`setShowPrimer(false)`、執行 reschedule
3. 若仍非 granted → 不動作

```
App.addListener('appStateChange', ({ isActive }) => {
  if (!isActive) return;
  const { display } = await LocalNotifications.checkPermissions();
  if (display === 'granted' && !notifEnabled) {
    setNotifEnabled(true);
    setNotifPermissionDenied(false);
    setShowPrimer(false);
    reschedule(...);
  }
});
```

**理由**：`AppOpenReset` 已是通知生命週期的協調點，appStateChange 與 App Open Reset 語意一致（都是「app 開啟/回前台時重整通知狀態」）。

**替代方案捨棄**：在 NotificationsPage 監聽。只有開著該頁才生效，無法覆蓋「在首頁 Primer 點 enable → 去設定 → 回首頁」的場景。

### 3. handleEnable 成功路徑簡化

granted 後：`setNotifEnabled(true)` → reschedule → `onComplete()`（關卡片）。
denied 後：`setNotifPermissionDenied(true)` → Toast 引導 → **不關卡片**（讓使用者看到引導）。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| appStateChange 在每次回前台都 checkPermissions，輕微開銷 | checkPermissions 是輕量 native 呼叫，且僅在 `!notifEnabled` 時才進一步動作 |
| listener 未正確清除造成記憶體洩漏 | useEffect cleanup 移除 listener |
| `@capacitor/app` 新依賴可能與既有 plugin 版本衝突 | 安裝對應 Capacitor v7 的版本，cap sync 驗證 |
| Web 環境無 appStateChange | 以 `isNativePlatform()` 守衛 |

## Migration Plan

1. `npm install @capacitor/app`，`cap sync ios`
2. `NotificationPrimerCard` 加 `onComplete` prop
3. `AppOpenReset` 傳 callback + 加 appStateChange 監聽
4. 模擬器 CDP + 真機驗證 13.5 閉環

無 DB migration、無 breaking change。

## Open Questions

- 無。方案已明確。
