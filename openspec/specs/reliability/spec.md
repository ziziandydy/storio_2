## ADDED Requirements

### Requirement: 啟動時環境變數驗證（Wave 3）
後端 MUST 在啟動時立即驗證所有必要環境變數是否存在，避免服務以不完整設定運行。

#### Scenario: 必要環境變數齊全，服務正常啟動
- **WHEN** 所有必要環境變數（`TMDB_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`）均已設定
- **THEN** 服務 MUST 正常啟動

#### Scenario: 必要環境變數缺失，服務拒絕啟動
- **WHEN** 任何必要環境變數在啟動時未設定或為空字串
- **THEN** 服務 MUST 拋出 `RuntimeError` 並立即終止
- **AND** 錯誤訊息 MUST 明確指出哪個環境變數缺失
- **AND** 服務 MUST NOT 繼續運行在降級狀態（快速失敗原則）

## MODIFIED Requirements

### Requirement: datetime 解析容錯（Wave 3）
後端處理外部 API 回應中的日期欄位時，MUST 對格式錯誤有容錯處理，不允許單一欄位解析失敗破壞整個 response。

#### Scenario: 日期格式正確
- **WHEN** 外部 API 返回格式正確的 ISO 8601 日期字串
- **THEN** 系統 MUST 正確解析並使用該日期

#### Scenario: 日期格式錯誤或缺失
- **WHEN** 外部 API 返回空字串、`null`、或非標準日期格式
- **THEN** 系統 MUST NOT 拋出未處理的 ValueError
- **AND** MUST 返回 `None` 或預設值，並繼續正常處理其他欄位
