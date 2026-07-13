## ADDED Requirements

### Requirement: Chip-Initiated Search Presentation
搜尋頁 SHALL 支援由 details chips 帶入的查詢：讀取 `q` 與精準參數（`pid`/`cid`/`gid`/`author`），進頁即以該查詢載入結果——搜尋框顯示 `q` 字串、結果沿用既有 StoryCard grid 與分頁切換，**不引入獨立結果模式頁**。使用者在搜尋框修改文字重新送出時，精準參數 MUST 清除（回歸自由搜尋與既有 fallback 行為）。此頁面 MUST 維持 query-param 驅動路由（相容 iOS 靜態 export）。

#### Scenario: 由 chip 進入搜尋頁
- **WHEN** 使用者經 details chip 導向 `/search?q=Christopher%20Nolan&pid=525`
- **THEN** 搜尋框顯示「Christopher Nolan」，頁面直接載入其作品結果，版面與一般搜尋完全相同

#### Scenario: 修改查詢即脫離精準模式
- **WHEN** 使用者在 chip 帶入的搜尋頁修改輸入文字並重新送出
- **THEN** 精準參數清除，改走一般搜尋流程（含人名自動偵測與既有 fallback）

#### Scenario: 精準參數空結果不觸發 AI fallback
- **WHEN** 帶精準參數的查詢回傳 0 筆
- **THEN** 顯示既有 No Results 樣式，且不發出 `/api/v1/search/ai` 請求
