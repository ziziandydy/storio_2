## ADDED Requirements

### Requirement: 前端傳遞 region 至後端
所有前端 API 呼叫 SHALL 包含 `X-Region: {region}` header，其值來自 `settingsStore.region`。

#### Scenario: Trending 請求包含 region header
- **WHEN** Explore 頁面載入 trending 電影/影集/書單
- **THEN** 請求 header 含 `X-Region: {用戶 region code}`（例如 `X-Region: CA`）

#### Scenario: 搜尋請求包含 region header
- **WHEN** 用戶執行搜尋（一般或 AI 語意搜尋）
- **THEN** 請求 header 含 `X-Region: {用戶 region code}`

### Requirement: 後端動態應用 region
後端 trending 與 search API SHALL 從 `X-Region` header 讀取 region（預設 `"TW"`），並傳遞至 TMDB、AI 推薦等下游服務，不得寫死任何地區代碼。

#### Scenario: 加拿大用戶取得 trending
- **WHEN** 請求含 `X-Region: CA`
- **THEN** TMDB trending API 使用 `region=CA`

#### Scenario: 無 X-Region header 的請求
- **WHEN** 請求不含 `X-Region` header
- **THEN** 後端使用預設 `"TW"`

### Requirement: AI 書單推薦依 region 在地化
Gemini 書單推薦 SHALL 根據 `region + language` 組合決定市場描述，並將 region 加入 cache key。

#### Scenario: 加拿大英語用戶取得書單
- **WHEN** region=`CA`，language=`en-US`
- **THEN** Gemini prompt 指定 target market 為 `Canada`，推薦英語加拿大市場書單

#### Scenario: 香港繁中用戶取得書單
- **WHEN** region=`HK`，language=`zh-TW`
- **THEN** Gemini prompt 指定 target market 為 `Hong Kong`，推薦繁體中文香港市場書單

#### Scenario: 不同 region 的書單快取相互獨立
- **WHEN** region=`TW`，language=`zh-TW` 的書單已快取
- **WHEN** 同一天 region=`HK`，language=`zh-TW` 發出請求
- **THEN** 系統視為快取 miss，重新向 Gemini 請求香港市場書單

### Requirement: AI 語意搜尋包含 region 上下文
`parse_intent` system prompt SHALL 包含用戶 language 與 region 資訊，以提升語意解析相關性。

#### Scenario: AI 搜尋感知用戶地區
- **WHEN** 用戶（region=CA）輸入 AI 搜尋查詢
- **THEN** system prompt 包含 `The user is browsing from region: CA`
