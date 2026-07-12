## ADDED Requirements

### Requirement: Discover-By Results Mode
搜尋頁 SHALL 支援 `by` query 參數結果模式（`by=person|company|genre` 搭配 `id`/`name`/`type`）：偵測到 `by` 參數時改呼叫 `/api/v1/search/by` 而非標準搜尋，結果以既有 StoryCard grid 呈現，並顯示目前查詢對象名稱（如「Christopher Nolan 的作品」）。此模式 MUST 沿用 query-param 驅動路由（相容 iOS 靜態 export）。

#### Scenario: 以 by 參數進入搜尋頁
- **WHEN** 使用者經 details chip 導向 `/search?by=person&id=525&name=Christopher%20Nolan&type=movie`
- **THEN** 頁面直接載入該人物的作品結果，無需再輸入關鍵字

#### Scenario: by 模式下空結果不觸發 AI fallback
- **WHEN** discover-by 查詢回傳 0 筆結果
- **THEN** 顯示既有 No Results 樣式，且不發出 `/api/v1/search/ai` 請求（discover 空結果即事實答案）
