## ADDED Requirements

### Requirement: Details Response Carries Entity Refs
The details API（`GET /api/v1/search/details/{media_type}/{external_id}`）SHALL 在既有字串欄位之外，additive 提供 `cast_refs`、`director_refs`、`genre_refs`、`company_refs` 欄位，內容為 `{id, name}` 物件陣列（TMDB numeric ID）。既有字串陣列欄位 MUST 維持不變（供已上架舊版 iOS 使用）。書籍（book）的 authors 維持字串陣列，不需 refs。

#### Scenario: 電影 details 回傳 refs
- **WHEN** 前端請求某電影的 details
- **THEN** response 同時包含 `cast`（字串陣列，不變）與 `cast_refs`（`{id, name}` 陣列），directors/genres/production_companies 亦同

#### Scenario: 舊版 client 相容
- **WHEN** 已上架的舊版 iOS app 請求 details
- **THEN** 既有欄位結構與內容完全不變，渲染不受影響

### Requirement: Person Name Auto-Detection In Standard Search
標準搜尋（`GET /api/v1/search/`）SHALL 以 TMDB `search/multi` 執行影視查詢：當 multi 首位結果為人物（`media_type: person`）且標題命中結果為 0 或極少時，系統 MUST 自動以該人物 ID 執行 `discover with_people` 並回傳其作品（popularity 排序、最多 20 筆、無海報過濾）。書籍側 SHALL 對同一 query 追加 Google Books `inauthor:` 查詢並與 free-text 結果合併去重。整個流程 MUST 於單次 API 請求內於 server 端完成，不呼叫任何 LLM。

#### Scenario: Explore 輸入導演名
- **WHEN** 使用者在 Explore 輸入「Christopher Nolan」送出（無精準參數）
- **THEN** 回傳其參與（演或導）的影視作品清單，而非空結果

#### Scenario: Explore 輸入作者名
- **WHEN** 使用者在 Explore 輸入「村上春樹」且瀏覽書籍分頁
- **THEN** 書籍結果包含 `inauthor:村上春樹` 的著作

#### Scenario: 輸入為一般標題不誤判
- **WHEN** 使用者輸入某作品標題且標題命中有結果
- **THEN** 回傳標題搜尋結果，不因 multi 含人物而切換為人物作品（「標題命中優先」規則**僅適用自由輸入**）

#### Scenario: chip 點擊不受標題命中優先影響
- **WHEN** 使用者點擊的人名 chip 恰好也是某作品標題（如《Amélie》），請求帶 `pid`
- **THEN** 一律以人物查詢（`with_people`）回傳該人作品，完全跳過偵測與標題搜尋

### Requirement: Precise Entity Query Parameters
標準搜尋 SHALL 支援選用參數 `pid`（TMDB person ID）、`cid`（company ID）、`gid`（genre ID）、`author`（作者名稱）：任一存在時 MUST 跳過人名偵測，直接執行對應查詢（`with_people`/`with_companies`/`with_genres`/`inauthor:`）。`cid`/`gid` 不支援書籍（book 範疇忽略或回空）。schema MUST 新增 `with_people`、`with_companies` discover 欄位。

#### Scenario: chips 帶 pid 精準查詢
- **WHEN** 請求 `/search/?q=Christopher%20Nolan&pid=525`
- **THEN** 直接以 `with_people=525` 回傳作品，無同名歧義、無額外偵測呼叫

#### Scenario: 精準參數空結果不觸發 AI fallback
- **WHEN** 帶 `pid`/`cid`/`gid`/`author` 的查詢回傳 0 筆
- **THEN** 前端顯示既有 No Results，且不發出 `/api/v1/search/ai` 請求（事實答案）

### Requirement: Details Page Clickable Entity Chips
詳情頁 SHALL 將演員、導演、Studio（製作公司清單）、影視類型渲染為可點擊 chips；書籍詳情頁的作者亦同。點擊 chip MUST 導向一般 Explore 搜尋頁：`q` 為該名稱（`encodeURIComponent`）、附帶對應精準參數（`pid`/`cid`/`gid`/`author`），媒體範疇對應來源頁（影視 → Movies/Series 分頁；書籍 → Books 分頁）。Studio 區塊 MUST 由單一公司顯示擴充為完整清單。`*_refs` 缺失時 chips MUST 降級為不可點純顯示。

#### Scenario: 點擊演員 chip
- **WHEN** 使用者在電影 details 頁點擊演員名稱 chip
- **THEN** 導向 `/search?q=<演員名>&pid=<id>`，搜尋框顯示該名稱，結果為該演員的影視作品（既有 grid 版面）

#### Scenario: 點擊書籍作者
- **WHEN** 使用者在書籍 details 頁點擊作者名稱
- **THEN** 導向 `/search?q=<作者名>&author=<作者名>`（Books 分頁），結果全為書籍

#### Scenario: 中文名稱與特殊字元
- **WHEN** chip 名稱含中文或特殊字元
- **THEN** URL 參數經 `encodeURIComponent` 編碼，跳轉與顯示皆正確

### Requirement: Return To Origin Details
從 chip 進入的搜尋頁 SHALL 以一般瀏覽歷史返回（上一頁即原 details 頁）。實作 MUST 先於 iOS 模擬器驗證 `router.back()` 跨頁 back stack 行為；驗證不通過則改用攜帶來源參數的 `router.push` 返回。

#### Scenario: 返回原詳情頁
- **WHEN** 使用者從 chip 跳轉的搜尋頁觸發返回
- **THEN** 回到原作品的 details 頁，內容正常渲染
