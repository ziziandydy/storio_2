## MODIFIED Requirements

### Requirement: 所有外部 HTTP 呼叫必須設有 timeout
後端所有透過 `httpx.AsyncClient` 發出的外部 API 請求 MUST 設定連線與讀取 timeout，防止 request 永久阻塞。

#### Scenario: 外部 API 正常回應
- **WHEN** TMDB 或 Google Books API 在 timeout 期限內回應
- **THEN** 系統 MUST 正常處理並返回結果（行為與現在相同）

#### Scenario: 外部 API 連線超時
- **WHEN** 與 TMDB 或 Google Books 的連線超過 5 秒未建立
- **THEN** `httpx` MUST 拋出 `ConnectTimeout`
- **AND** 後端 MUST 捕獲此例外並返回 503 Service Unavailable
- **AND** 不得讓 request 無限 hang

#### Scenario: 外部 API 讀取超時
- **WHEN** 連線已建立但 API 回應超過 15 秒未完成
- **THEN** `httpx` MUST 拋出 `ReadTimeout`
- **AND** 後端 MUST 捕獲此例外並返回 503 Service Unavailable

### Requirement: Timeout 設定統一化
- 所有 `httpx.AsyncClient()` 實例化 MUST 使用統一設定：
  - `connect=5.0s`：防止 DNS/TCP 連線阻塞
  - `read=15.0s`：允許慢速 API 回應但有上限
  - `write=5.0s`：上傳 request body 超時保護
  - `pool=5.0s`：等待連線池超時保護
- 影響檔案：`server/app/api/v1/endpoints/search.py`（trending/details/ai 路由）以及所有其他使用 httpx 的 service 層
