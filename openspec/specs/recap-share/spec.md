# recap-share Specification

## Purpose
年度 Recap（change: year-recap，歸檔於 2026-11-11）。

## Requirements
### Requirement: 圖片分享流程

預覽 SHALL 提供「分享」按鈕，開啟面板選擇圖片比例（9:16 或 4:5），並以每個出現的場景輸出一張圖。每張圖 SHALL 可勾選，預設全選。階段 2 面板 MUST NOT 顯示尚未上線的影片選項。

#### Scenario: 預設全選
- **WHEN** 用戶開啟分享面板
- **THEN** 所有出現的場景（不含預覽最後一頁的「繼續收藏」）皆為已勾選

#### Scenario: 取消勾選
- **WHEN** 用戶取消勾選心得場景後分享
- **THEN** 輸出的圖片不含心得場景

#### Scenario: 切換比例
- **WHEN** 用戶選擇 4:5
- **THEN** 輸出的每張圖比例為 4:5

### Requirement: 原生與網頁的分享方式

原生 App SHALL 將圖片寫入檔案後，提供「儲存全部到相簿」作為多張圖的主要動作（透過系統分享面板的「儲存影像」），並提供「分享這一張」走單張分享；MUST NOT 使用 `<a download>`。一次傳多張給其他 App 只作次要選項，因為 Instagram 只會收到第 1 張（iPhone XR 實測）。網頁桌面 SHALL 保留下載。任何路徑都不得顯示假成功。

#### Scenario: 儲存全部到相簿
- **WHEN** 在 iOS App 內按「儲存全部」
- **THEN** 跳出系統分享面板，內含所選全部圖片，選「儲存影像」後全部存入相簿

#### Scenario: 分享單張
- **WHEN** 在 iOS App 內對某一場景按「分享這一張」
- **THEN** 跳出系統分享面板，內含該張圖片，可直接分享到 Instagram

#### Scenario: 一次傳送失敗
- **WHEN** 系統分享面板拒絕一次傳送多張
- **THEN** 用戶看到的結果與實際一致，不顯示成功

### Requirement: 品牌與下載引導

每張分享圖 SHALL 在角落帶 Storio 標誌；結尾場景 SHALL 包含品牌、標語 "Collect stories in your Folio" 與下載線索（App Store／Google Play 名稱與 QR code），並提供中英文版。

#### Scenario: 品牌標誌
- **WHEN** 輸出任一場景圖
- **THEN** 圖片角落有 Storio 標誌

#### Scenario: 結尾場景
- **WHEN** 輸出結尾場景圖
- **THEN** 圖片含標語與下載線索

### Requirement: 私人內容保護

心得內容 MUST NOT 在用戶不知情下被分享：心得場景 SHALL 在預覽中可見，用戶可換句或取消勾選。

#### Scenario: 預覽即所見
- **WHEN** 心得場景被勾選
- **THEN** 預覽中顯示的引文與輸出圖一致

### Requirement: 渲染路由不產生副作用

Recap 場景的渲染頁 SHALL 遵循 `share-render-route`：不建立匿名帳號、不記錄任何互動事件。

#### Scenario: 渲染不建帳號
- **WHEN** Puppeteer 服務載入 Recap 渲染頁
- **THEN** 不建立 Supabase 匿名帳號，不上報事件

### Requirement: 互動事件

系統 SHALL 在用戶開啟 Recap 時記錄 `recap_opened`（含年份），在完成分享時記錄 `recap_shared`（含年份與分享的場景數），沿用既有 `engagement_events` 的去重與平台判斷。

#### Scenario: 開啟
- **WHEN** 用戶開啟 2026 年 Recap
- **THEN** 記錄一筆 `recap_opened`，年份為 2026

#### Scenario: 分享
- **WHEN** 用戶分享 12 張圖
- **THEN** 記錄 `recap_shared`，場景數為 12
