## ADDED Requirements

### Requirement: Details Response Carries Entity Refs
The details API（`GET /api/v1/search/details/{media_type}/{external_id}`）SHALL 在既有字串欄位之外，additive 提供 `cast_refs`、`director_refs`、`genre_refs`、`company_refs` 欄位，內容為 `{id, name}` 物件陣列（TMDB numeric ID）。既有字串陣列欄位 MUST 維持不變（供已上架舊版 iOS 使用）。書籍（book）的 authors 維持字串陣列，不需 refs。

#### Scenario: 電影 details 回傳 refs
- **WHEN** 前端請求某電影的 details
- **THEN** response 同時包含 `cast`（字串陣列，不變）與 `cast_refs`（`{id, name}` 陣列），directors/genres/production_companies 亦同

#### Scenario: 舊版 client 相容
- **WHEN** 已上架的舊版 iOS app 請求 details
- **THEN** 既有欄位結構與內容完全不變，渲染不受影響

### Requirement: Discover-By Search Endpoint
The system SHALL 提供 `GET /api/v1/search/by` endpoint，依 `by`（person/company/genre）與 `type`（movie/tv/book）參數查詢相關作品，回傳與既有搜尋一致的 `SearchResponse` 結構。分流規則：

| by \ type | movie / tv | book |
|-----------|-----------|------|
| person | TMDB discover `with_people`（帶 person ID） | Google Books `inauthor:`（帶名稱，不經 AI intent parser） |
| company | TMDB discover `with_companies`（帶 company ID） | 400 不支援 |
| genre | TMDB discover `with_genres`（帶 genre ID） | 400 不支援（v1 排除） |

Endpoint MUST 套用 rate limit（30/min，與標準搜尋一致），並遵循 Controller → Service 三層架構。

#### Scenario: 依導演查影視作品
- **WHEN** 請求 `/search/by?by=person&id=525&type=movie`（Christopher Nolan）
- **THEN** 回傳該人物參與（演或導，`with_people` 語意）的影視作品，依 popularity 排序，最多 20 筆，無海報者過濾

#### Scenario: 依作者查書籍
- **WHEN** 請求 `/search/by?by=person&name=村上春樹&type=book`
- **THEN** 回傳 Google Books `inauthor:村上春樹` 的書籍結果，不呼叫任何 LLM

#### Scenario: 不支援的組合
- **WHEN** 請求 `by=genre&type=book` 或 `by=company&type=book`
- **THEN** 回傳 400 與明確錯誤訊息

### Requirement: Details Page Clickable Entity Chips
詳情頁 SHALL 將演員、導演、Studio（製作公司清單）、影視類型渲染為可點擊 chips；書籍詳情頁的作者亦同。點擊 chip MUST 導向搜尋頁的 discover-by 結果模式，且媒體範疇對應來源頁（影視 details → `type=movie|tv`；書籍 details → `type=book`）。Studio 區塊 MUST 由單一公司顯示擴充為完整清單。

#### Scenario: 點擊演員 chip
- **WHEN** 使用者在電影 details 頁點擊演員名稱 chip
- **THEN** 導向 `/search?by=person&id=...&name=...&type=movie`，顯示該演員的影視作品

#### Scenario: 點擊書籍作者
- **WHEN** 使用者在書籍 details 頁點擊作者名稱
- **THEN** 導向書籍範疇的作者搜尋結果，結果全為書籍

#### Scenario: 中文名稱與特殊字元
- **WHEN** chip 名稱含中文或特殊字元
- **THEN** URL 參數經 `encodeURIComponent` 編碼，跳轉與顯示皆正確

### Requirement: Return To Origin Details
從 chip 跳轉的搜尋結果頁 SHALL 提供返回動線回到原 details 頁，且返回後原頁面可正常瀏覽。實作 MUST 先於 iOS 模擬器驗證 `router.back()` 跨頁 back stack 行為；驗證不通過則改用攜帶來源參數的 `router.push` 返回。

#### Scenario: 返回原詳情頁
- **WHEN** 使用者從 chip 跳轉的搜尋結果頁觸發返回
- **THEN** 回到原作品的 details 頁，內容正常渲染
