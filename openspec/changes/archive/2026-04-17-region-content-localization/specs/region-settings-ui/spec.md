## ADDED Requirements

### Requirement: 裝置 region 自動偵測
App 首次啟動時，系統 SHALL 從 `navigator.language` 解析 ISO 3166-1 region code 作為預設地區；無法解析時 fallback `"TW"`。

#### Scenario: 裝置語言含地區碼
- **WHEN** `navigator.language` 為 `"en-CA"`
- **THEN** `detectRegion()` 回傳 `"CA"`

#### Scenario: 裝置語言無地區碼或無法解析
- **WHEN** `navigator.language` 為 `"zh"` 或空字串
- **THEN** `detectRegion()` 回傳 `"TW"`

#### Scenario: SSR 環境 navigator 不可用
- **WHEN** `navigator` 拋出例外（SSR）
- **THEN** `detectRegion()` 回傳 `"TW"`

### Requirement: Region 設定 UI
Profile → Settings 頁面 SHALL 提供 Region 選擇器，樣式與現有 Language sub-view 一致，列出 20 個精選地區，支援 i18n（zh-TW / en-US）。

#### Scenario: 用戶進入 Region 設定
- **WHEN** 用戶在 Profile → Settings 點擊「地區 / Region」列表項目
- **THEN** 系統顯示 20 個地區清單 sub-view，目前選中地區右側顯示 ✓

#### Scenario: 用戶選擇地區
- **WHEN** 用戶點擊清單中的地區（例如 🇨🇦 加拿大 / Canada）
- **THEN** `settingsStore.region` 更新為 `"CA"`，persist 至 storage
- **THEN** sub-view 關閉，Settings 列表顯示新地區名稱

#### Scenario: 地區名稱依 App 語言顯示
- **WHEN** `settingsStore.language` 為 `"zh-TW"`
- **THEN** 地區清單顯示中文名稱（例如「加拿大」）
- **WHEN** `settingsStore.language` 為 `"en-US"`
- **THEN** 地區清單顯示英文名稱（例如「Canada」）
