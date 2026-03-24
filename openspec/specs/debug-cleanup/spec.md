## MODIFIED Requirements

### Requirement: 移除 production log 中的敏感資訊
後端 MUST NOT 在任何 log 或回應中洩漏 API key、token 或其片段。

#### Scenario: Supabase client 初始化不洩漏 key
- **WHEN** 後端啟動並初始化 Supabase client
- **THEN** 系統 MUST NOT 輸出任何包含 key 前綴或片段的 log 訊息
- **AND** 若需要記錄模式（ANON/SERVICE_ROLE），改用 `logging.info()` 且不含 key 內容

#### Scenario: Exception 不洩漏實作細節
- **WHEN** 任何後端 service 或 repository 拋出 exception
- **THEN** API response MUST 只返回通用錯誤訊息（例如 `"Internal server error"`）
- **AND** 實際 exception message MUST 只記錄至 server log，不回傳 client
- **AND** 不得洩漏 stack trace、SQL query、第三方 API 回應內容

### Requirement: 清除所有 debug print 語句
後端程式碼 MUST NOT 包含 `print()` 語句在正式功能邏輯中。

#### Scenario: 程式碼無殘留 print 語句
- **WHEN** 掃描 `server/app/` 下所有 `.py` 檔案
- **THEN** MUST NOT 找到任何非測試用的 `print()` 呼叫
- **AND** 任何必要的診斷輸出 MUST 改用 Python `logging` 模組

## MODIFIED Requirements

### Requirement: CORS 設定明確化
後端 CORS 設定 MUST NOT 使用萬用字元 `"*"` 作為 `allow_methods` 或 `allow_headers`。

#### Scenario: 僅允許必要的 HTTP 方法
- **WHEN** 瀏覽器發送 CORS preflight 請求
- **THEN** 系統 MUST 只允許 `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- **AND** MUST NOT 允許 `PATCH`, `TRACE`, `CONNECT` 等不使用的方法

#### Scenario: 僅允許必要的 Headers
- **WHEN** 瀏覽器發送含自訂 header 的請求
- **THEN** 系統 MUST 只允許 `Content-Type`, `Authorization`, `X-App-Language`, `X-Region`
