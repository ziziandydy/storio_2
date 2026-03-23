## ADDED Requirements

### Requirement: AI 端點速率限制
後端 MUST 對 AI 搜尋端點實施 IP 層級速率限制，防止過量請求耗盡 API 費用。

#### Scenario: 正常請求通過限制
- **WHEN** 用戶從同一 IP 在 1 分鐘內發送 ≤10 次 POST `/api/v1/search/ai` 請求
- **THEN** 系統 MUST 正常處理所有請求並返回 200

#### Scenario: 超過 AI 端點速率限制
- **WHEN** 用戶從同一 IP 在 1 分鐘內發送 >10 次 POST `/api/v1/search/ai` 請求
- **THEN** 系統 MUST 對超出的請求返回 **429 Too Many Requests**
- **AND** response body MUST 包含 `{"detail": "Rate limit exceeded. Please try again later."}`

#### Scenario: 超過一般搜尋速率限制
- **WHEN** 用戶從同一 IP 在 1 分鐘內發送 >30 次 GET `/api/v1/search/` 請求
- **THEN** 系統 MUST 返回 **429 Too Many Requests**

### Requirement: 統一速率限制錯誤處理
- **WHEN** 任何端點觸發速率限制
- **THEN** 系統 MUST 返回一致的 JSON 格式錯誤，而非 HTML 或純文字

## MODIFIED Requirements

### Requirement: Search Query 輸入長度驗證
`basic-search` 能力 MUST 拒絕過長的搜尋字串以防止 AI API 費用濫用。

#### Scenario: 一般長度查詢
- **WHEN** 發送 `q` 參數長度 ≤200 的搜尋請求
- **THEN** 系統 MUST 正常執行搜尋

#### Scenario: 超長查詢被拒絕
- **WHEN** 發送 `q` 參數長度 >200 的搜尋請求（GET 或 POST AI 搜尋）
- **THEN** 系統 MUST 返回 **422 Unprocessable Entity**
- **AND** 不得呼叫任何 AI API
