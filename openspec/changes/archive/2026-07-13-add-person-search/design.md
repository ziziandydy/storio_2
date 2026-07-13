# Design: 人物/類型搜尋擴充

## Context

Storio 的詳情頁（`StoryDetailsView`）已顯示演員、導演、Studio、類型與書籍作者，但均為不可互動的展示資訊；搜尋（v1.15 後為 keyword-first + AI fallback）只能以標題查詢。TMDB discover（`with_people`/`with_companies`/`with_genres`）與 Google Books `inauthor:` 在 API 層完整支援「依人物/類型探索」。

關鍵現況（經 code review 實證，見已核准設計文件）：

- `ItemDetailResponse` 只存名稱字串，`_fetch_tmdb_details` 丟棄 TMDB numeric ID，而 discover 只吃 ID。
- `StoryDetailsView` 的 cast/genres 已是 pill 樣式；directors 是 `join(', ')` 純文字；Studio 只顯示 `production_companies[0]`。
- `router.back()` 僅用於 details 頁自身返回鈕，跨頁往返（details→search→back）在 Capacitor iOS WebView 未經驗證。
- iOS 靜態 export（`output: 'export'`），所有路由走 query parameter。

## Goals / Non-Goals

**Goals:**

- details 頁的人物/Studio/類型可點擊，跳轉至搜尋頁顯示相關作品，並可返回原 details 頁。
- Explore 搜尋能力涵蓋人物（演員/導演/作者）、公司、影視類型。
- 影視 details 跳轉只出影視結果；書籍 details 只出書籍結果。

**Non-Goals:**

- 書籍 genre（BISAC 英文分類）點擊——v1 不做。
- 出版社（publisher）點擊——v1 不做。
- 人物詳情頁（Letterboxd 式 `/person` 頁）——未來有用戶量再議。
- details 頁內嵌相關作品抽屜（bottom sheet）——列為未來體驗優化。

## Decisions

### D1: ID 缺口採 A-1（schema 帶 ID），以「加欄位」而非「改欄位」落地

details response **保留既有字串陣列欄位不動**（cast/directors/genres/production_companies），**新增** `cast_refs`/`director_refs`/`genre_refs`/`company_refs` 為 `[{id, name}]`；新前端 chips 讀 `*_refs`，舊欄位供已上架 iOS 舊版持續使用。

- 理由：chip 點擊零額外延遲、無同名誤判（勝過 A-2 by-name 反查的額外 API call 與歧義）；additive 欄位讓已上架且無法強制更新的 iOS 舊版完全不受影響，回歸風險趨近零。
- 代價：response payload 名稱短期重複存在；舊欄位待 iOS 版本淘汰後於未來版本移除。
- 書籍作者例外：Google Books `inauthor:` 吃名稱字串，authors 維持字串陣列即可（無 ID 需求）。

### D2: person 查詢用 `with_people`，不用 `with_cast`+`with_crew`

TMDB discover 同時帶 `with_cast` 與 `with_crew` 是 AND 語意（同時演又導），`with_people` 才是原生 cast-or-crew。單一參數、單次呼叫。

### D3: 不做獨立 by 模式頁面——擴充既有 `GET /api/v1/search/`，UI 就是一般 Explore 搜尋

（依用戶確認的心智模型修訂：「details 點 chips → Explore 查詢該字串，返回回上一頁」。）

**API 查核結論**：TMDB 無通用模式——`search/movie|tv` 只搜標題；`search/multi` 找得到人（`media_type: person`）但只附 `known_for` 少量代表作，完整作品必須第二步 `discover with_people`。Google Books 為半通用——free-text 命中作者但混雜，`inauthor:` 精準。故「人名 → 作品」必為兩段式，**做在 server 端讓前端與使用者無感**。

- **人名自動偵測（自由輸入路徑）**：標準搜尋 service 改打 TMDB `search/multi`；若首位結果為 person，取其 ID 接 `discover with_people` 作為影視結果（標題命中則照舊）。書籍側對同 query 追加 `inauthor:` 合併去重。Explore 手動輸入人名即穩定回該人作品。
- **精準參數透傳（chips 路徑）**：`/search/` 新增選用參數 `pid`/`cid`/`gid`/`author`，存在時直接 discover / `inauthor:`，跳過偵測——零同名歧義、零額外往返。
- 分流矩陣（參數存在時）：

| 參數 | 影視 | 書籍 |
|------|------|------|
| `pid` | discover `with_people` | —（書用 `author`） |
| `author` | — | Google Books `inauthor:` |
| `cid` | discover `with_companies`（schema 新增欄位） | 不提供 |
| `gid` | discover `with_genres` | v1 不做 |

- 理由（vs 獨立 endpoint）：前端零新頁面模式、搜尋頁改動極小；rate limit 沿用同一 limiter；`search/multi` 取代雙呼叫（movie+tv 原本就是兩次，multi 一次涵蓋 movie/tv/person）。

### D4: 空結果規則依「查詢確定性」分流

- 帶精準參數（pid/cid/gid/author）→ 空結果是事實答案，**不觸發 AI fallback**，顯示既有 No Results。
- 自由輸入（無參數）→ 維持既有 Auto fallback 鏈：keyword/偵測皆空 → AI 兜底——人名偵測失敗時仍有第二層保障，最大化「輸入人名必出作品」。

### D5: 返回即一般上一頁，先驗 `router.back()`，備援 `router.push`

chips 是以 `router.push` 進入搜尋頁的一般瀏覽歷史，返回即 `router.back()`。實作第一步在 iOS 模擬器驗證 details→search→back 的 back stack（scroll position、狀態保留）。不成立則 chip 跳轉時把來源 details 的 `type`/`id` 帶進 search URL，返回改 `router.push` 回 details。

### D6: genre 在地化交給 TMDB

TMDB 帶 `language=zh-TW` 自動回中文 genre 名稱，chip 帶 genre ID 跳轉，前端不建對照表。

## Risks / Trade-offs

- [API contract 變更破壞既有渲染] → D1 採 additive `*_refs` 欄位，既有欄位不動，舊版 iOS 零影響；驗收仍含「details 頁既有顯示不回歸」；後端 pytest 覆蓋新 schema。
- [`router.back()` 跨頁行為不符預期] → D5 備援方案，且列為 tasks 第一步（先驗證再蓋 UI）。
- [TMDB rate limit（新查詢型態增加用量）] → discover 為單次查詢、無扇出；沿用 `/search/` 既有 limiter（30/min）；`search/multi` 一次取代原 movie+tv 兩次呼叫，用量反而下降。
- [`search/multi` 取代雙呼叫造成標題搜尋行為改變（混合排序、取量差異）] → service 層維持現行過濾規則（無海報過濾、各型別取量），以既有 `test_search_endpoint` 類測試鎖住標題搜尋回歸。
- [人名偵測誤判（輸入標題卻被當人名）] → 觸發條件從嚴：僅當 multi 首位為 person 且標題命中結果為 0 或極少時才切換；偵測結果與標題命中可併列回傳。
- [同名 Studio/公司多筆] → company chip 帶 TMDB company ID（來自 details response），無反查歧義。
- [`with_people` 對超多產人物回傳過廣] → 沿用 discover 預設 `popularity.desc` 排序，取前 20 筆，與現行 trending/discover 行為一致。

## Migration Plan

無資料庫變更。D1 為 additive contract：Railway 後端可先行部署（舊版前端/iOS 完全不受影響），Vercel 與 iOS 新版隨後上線讀取 `*_refs`。無需部署協調、可獨立 rollback（撤前端即可，後端新欄位為 no-op）。舊字串欄位的移除排入未來版本（待 iOS 舊版佔比趨零）。

## Open Questions

- 無（design 階段已清空；`router.back()` 驗證屬 tasks 執行項）。
