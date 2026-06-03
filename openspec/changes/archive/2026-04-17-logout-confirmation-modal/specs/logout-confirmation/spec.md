## ADDED Requirements

### Requirement: 登出需二次確認
點擊 Profile 頁面登出按鈕時，系統 SHALL 顯示確認 modal，用戶明確確認後才執行登出；取消則維持登入狀態。

#### Scenario: 用戶點擊登出按鈕
- **WHEN** 已登入用戶點擊 Profile 頁面的登出按鈕
- **THEN** 系統顯示確認 modal，不立即登出

#### Scenario: 用戶確認登出
- **WHEN** 確認 modal 顯示後，用戶點擊「登出 / Sign Out」按鈕
- **THEN** 系統執行 `signOut()`，導向首頁

#### Scenario: 用戶取消登出
- **WHEN** 確認 modal 顯示後，用戶點擊「取消 / Cancel」或點擊背景遮罩
- **THEN** modal 關閉，用戶維持登入狀態，停留在 Profile 頁面

### Requirement: 確認 modal 支援 i18n
Modal 內所有文字 SHALL 依 `settingsStore.language` 顯示正確語言（zh-TW / en-US）。

#### Scenario: zh-TW 語言下顯示繁中
- **WHEN** `settingsStore.language` 為 `zh-TW`
- **THEN** modal 標題顯示「確定要登出嗎？」，確認按鈕顯示「登出」

#### Scenario: en-US 語言下顯示英文
- **WHEN** `settingsStore.language` 為 `en-US`
- **THEN** modal 標題顯示「Sign out?」，確認按鈕顯示「Sign Out」

### Requirement: 確認 modal 視覺與現有 modal 一致
Modal SHALL 使用 Framer Motion `AnimatePresence`，backdrop `bg-black/95 backdrop-blur-xl`，卡片 `bg-folio-black border border-white/10 rounded-[32px]`，進場動畫 `scale 0.9→1 + opacity 0→1 + y 20→0`。

#### Scenario: Modal 進場動畫
- **WHEN** modal 開啟
- **THEN** 卡片以 scale + fade + y 位移動畫進場，與 GuestLimitModal 一致
