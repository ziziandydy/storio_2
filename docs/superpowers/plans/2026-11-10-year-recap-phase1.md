# 年度 Recap 階段 1（資料基礎）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 後端算出年度 Recap 全部 15 個場景所需資料，並提供 `GET /api/v1/collection/recap?year=` 與 `GET /api/v1/collection/recap/years`；階段 1 單獨合併後用戶看不到變化。

**Architecture:** 統計全寫成不碰 DB 的純函式（`recap_stats.py`、`recap_titles.py`），以便 TDD；`CollectionRepository` 只負責讀寫列；`RecapService` 串起「讀列 → 補抓缺資料（有限並行＋時間預算）→ 算場景」；endpoint 為 `async def`。每個場景要嘛是資料物件、要嘛是 `null`，門檻判斷全在後端。

**Tech Stack:** FastAPI、Pydantic v2、supabase-py（同步）、httpx（async）、pytest（`MagicMock`／`AsyncMock`）。

**Spec:** `openspec/changes/year-recap/`（`design.md`、`specs/recap-data/spec.md`、`tasks.md` 的 1.1–1.10）；產品設計 `docs/superpowers/specs/2026-11-10-year-recap-design.md` §4–§5。

## Global Constraints

- 全部文件、註解、commit 訊息用繁體中文；術語依 `GEMINI.md`（Folio／Stories，不用 Desert 等）。
- 三層架構：endpoint → service → repository；endpoint 不直接碰 Supabase。
- 所有新欄位可為 null；新增欄位 MUST NOT 影響既有 API 回應與舊版 App。
- 年份／月份一律取自 `archived_date` 字串，為空退回 `created_at` 前 10 字元，**不做時區轉換**。
- 門檻：該年 ≥ 3 筆才能產生 Recap（`RECAP_THRESHOLD = 3`）；不足回 404，detail 含 `needed`。
- 書的時間 = 頁數 ÷ 每小時 40 頁（`BOOK_PAGES_PER_HOUR = 40`，集中定義）；只加總有資料的作品。
- 補抓：並行 5、時間預算 8 秒、成功寫回、失敗視為無資料；不用背景 job（Railway fire-and-forget 不可靠，寫入一律 `await`）。
- 稱號：規則式、決定性、不呼叫 AI、全部正面；中英文各 12 個以內的草案（文案待 Tu 審閱）。
- `genres` 一律存**英文原名**（補抓以 `en-US` 取 TMDB）；之後前端若在收藏時回傳 `genres`，必須送英文名（本計畫不改前端）。
- 後端測試用 dummy env 執行、不連真實 Supabase；會走 Gemini／OpenAI 備援的測試需 patch 清空 `OPENAI_API_KEY`（本計畫的測試不會走到）。
- 新路由 `/recap`、`/recap/years` 必須註冊在 `/{story_id}` 之前。
- 不在 main 上開發；本計畫在分支 `worktree-year-recap-impl`。migration 009 由 Tu 在 Supabase dev 再 prod 執行，Claude 不執行。

## Review Focus

1. **先部署後端、後跑 migration**：`create_story` 不得送出值為 None 的新欄位，否則欄位尚未存在時新增收藏會失敗（Task 1 測試）。
2. **路由遮蔽**：`GET /collection/recap` 若在 `/{story_id}` 之後註冊會被當成 UUID 而回 422（Task 8 測試）。
3. **日期邊界**：`archived_date=2025-12-31` 但 `created_at=2026-01-01` 屬於 2025；`archived_date` 為 null 用 `created_at` 前 10 字元；兩者皆空的列不屬於任何年（Task 2 測試）。
4. **同一作品當年收藏多次（重看）**：統計以「列」計；補抓同一作品只向外部取一次（Task 2、5 測試）。
5. **評分 0 與空白心得**：評分 0 不得成為「最高分」；只有空白的心得不得讓心得場景出現（Task 3 測試）。

---

## 檔案結構

- Create `server/migrations/009_recap_metadata.sql`
- Modify `server/app/schemas/item.py`（`StoryCreate`、`StoryResponse` 加 4 個可為 null 欄位）
- Modify `server/app/repositories/collection_repo.py`（`create_story` 略過 None 新欄位；新增 `get_recap_rows`、`update_recap_metadata`）
- Create `server/app/services/recap_stats.py`（純函式：年份歸屬、時間、類別、故事年齡、月份、年度之最、開始結束、心得）
- Create `server/app/services/recap_titles.py`（稱號表與 `select_title`）
- Create `server/app/services/recap_access.py`（`can_view_recap_year`）
- Create `server/app/services/recap_backfill.py`（`needs_backfill`、`extract_metadata`、`backfill_rows`）
- Create `server/app/schemas/recap.py`（`RecapResponse`、`RecapYearsResponse`）
- Create `server/app/services/recap_service.py`（`RecapService.build_recap`、`list_years`）
- Modify `server/app/api/v1/endpoints/collection.py`（兩個新 endpoint）
- Tests：`server/tests/test_recap_schema.py`、`test_recap_stats.py`、`test_recap_titles.py`、`test_recap_access.py`、`test_recap_backfill.py`、`test_recap_service.py`、`test_recap_api.py`

測試指令（單檔）：`cd server && SUPABASE_URL=https://dummy.supabase.co SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_KEY=dummy TMDB_API_KEY=dummy python3 -m pytest tests/<檔名> -v`。下文簡寫為 `pytest <檔名>`。

**列（row）格式**：`get_recap_rows` 回傳的 dict，鍵為 `id, external_id, title, media_type（已把 DB 的 movie+subtype tv 還原成 tv）, year, poster_path, rating, notes, created_at, archived_date, seasons, runtime_minutes, episode_total, genres, page_count`；日期皆為字串。

---

### Task 1: Migration 009 與 schema／repo 新欄位（1.1、1.2、1.3）

**Files:**
- Create: `server/migrations/009_recap_metadata.sql`
- Modify: `server/app/schemas/item.py`、`server/app/repositories/collection_repo.py`
- Test: `server/tests/test_recap_schema.py`

**Interfaces:**
- Produces: `StoryCreate` 與 `StoryResponse` 新增 `runtime_minutes: Optional[int]`、`episode_total: Optional[int]`、`genres: Optional[List[str]]`、`page_count: Optional[int]`（皆預設 None）；`CollectionRepository.get_recap_rows(user_id: str) -> List[dict]`；`CollectionRepository.update_recap_metadata(user_id: str, story_id: str, fields: dict) -> None`（只接受上述 4 個鍵，其餘忽略，`.eq("user_id", …)` 保護）。

- [ ] **Step 1: 寫失敗測試 `test_recap_schema.py`**
  - `test_story_response_old_row_has_new_fields_none`：用不含新欄位的舊列建 `StoryResponse`，4 欄皆為 None。
  - `test_create_story_omits_none_metadata`：mock `repo.table.insert`，`create_story` 一筆未帶新欄位的 `StoryCreate` 後，檢查傳給 `insert` 的 dict **不含** `runtime_minutes`、`episode_total`、`genres`、`page_count` 四鍵。
  - `test_create_story_writes_provided_metadata`：帶 `runtime_minutes=129, genres=["Drama"]` → insert dict 含這兩鍵、不含另外兩鍵。
  - `test_update_recap_metadata_whitelists_keys`：`fields={"runtime_minutes": 90, "rating": 10}` → `table.update` 只收到 `{"runtime_minutes": 90}`，且 `.eq("user_id", …)` 被呼叫。
  - `test_get_recap_rows_maps_tv`：DB 列 `media_type="movie", subtype="tv"` → 回傳列 `media_type == "tv"`，且 select 只取列格式中列出的欄位。

- [ ] **Step 2: 跑測試確認失敗**：`pytest test_recap_schema.py -v`，預期 FAIL（欄位／方法未定義）。

- [ ] **Step 3: 實作**
  - `009_recap_metadata.sql`：參考 `002_add_seasons.sql` 格式，4 個 `ALTER TABLE collections ADD COLUMN IF NOT EXISTS`（`runtime_minutes integer`、`episode_total integer`、`genres text[]`、`page_count integer`），檔頭註明冪等、不回填、由 Tu 在 Supabase 執行，結尾附註解形式的驗證查詢。
  - `schema/item.py`：在 `StoryCreate`、`StoryResponse` 加 4 欄位（`StoryBase` 不動，避免影響 `SearchResponse` 等）。
  - `collection_repo.py`：`create_story` 在既有 `archived_date` 處理之後，對 4 個新鍵若值為 None 則 `data.pop`；新增兩個方法，沿用 `_execute_with_retry` 與 `_map_from_db`。

- [ ] **Step 4: 跑測試確認通過**，並跑 `pytest test_collection_repo.py test_collection_service.py test_item_schemas.py -v` 確認既有測試不變。

- [ ] **Step 5: Commit** — `feat(recap): 新增作品資料欄位 migration 009 與 repo 讀寫`

---

### Task 2: 統計純函式（一）年份、時間、類別、故事年齡（1.5 前半）

**Files:**
- Create: `server/app/services/recap_stats.py`
- Test: `server/tests/test_recap_stats.py`

**Interfaces:**
- Produces（皆為純函式，輸入為列 dict）：
  - 常數 `RECAP_THRESHOLD = 3`、`BOOK_PAGES_PER_HOUR = 40`
  - `effective_date(row: dict) -> Optional[str]`：回傳 `YYYY-MM-DD`；`archived_date` 優先，退回 `created_at[:10]`，皆空回 None
  - `year_of(row: dict) -> Optional[int]`
  - `rows_in_year(rows: List[dict], year: int) -> List[dict]`
  - `estimate_minutes(row: dict) -> Optional[int]`：movie＝`runtime_minutes`；tv＝`runtime_minutes * episode_total`（任一為 None 則 None）；book＝`round(page_count * 60 / BOOK_PAGES_PER_HOUR)`；無資料 None
  - `time_summary(rows: List[dict]) -> dict`：`{"count": 列數, "minutes": 有資料者加總, "items_with_data": 有資料列數, "estimated": 是否含 tv 或 book 的估算}`
  - `top_genres(rows, limit: int = 3) -> Optional[List[dict]]`：至少 3 列有 `genres` 才回傳，否則 None；元素 `{"name": str, "count": int}`
  - `story_age(rows, year: int) -> Optional[dict]`：至少 5 列有 `year` 才回傳 `{"avg_year": int, "age": int, "favorite_decade": int}`，否則 None

- [ ] **Step 1: 寫失敗測試**（以工廠函式 `make_row(**overrides)` 產生列）
  - 日期：`archived_date="2025-12-31", created_at="2026-01-01T03:00:00+00:00"` → `year_of == 2025`；`archived_date=None, created_at="2026-03-05T00:00:00+00:00"` → `effective_date == "2026-03-05"`；兩者皆 None → `year_of is None`，且 `rows_in_year` 不含該列。
  - 時間：movie 120 分 → 120；tv `runtime_minutes=45, episode_total=10` → 450；tv 缺 `episode_total` → None；書 `page_count=1200` → 1800（即 30 小時，spec 情境）；`time_summary` 對「一部電影無片長＋一部 120 分電影」→ `count=2, minutes=120, items_with_data=1, estimated=False`；含書 → `estimated=True`。
  - 同一作品當年收藏兩次（兩列 `external_id` 相同）→ `count == 2`、時間加兩次。
  - 類別：每部所有類別都計入；`["Drama","Crime"]` 與 `["drama"]` 的 `Drama` 以不分大小寫合併、顯示取第一次出現的寫法；排名同分以名稱字母序（決定性）；只有 2 列有類別 → None。
  - 故事年齡：2026 年、作品年份平均 2009 → `age == 17`；年份 `[1999,1994,2003,2001,1995]` → `favorite_decade == 1990`；十年同分取較近的十年；只有 4 列有 `year` → None。
  - 決定性：同一輸入連跑兩次結果相等。

- [ ] **Step 2: 跑測試確認失敗**：`pytest test_recap_stats.py -v`。

- [ ] **Step 3: 實作** 上述函式；`avg_year` 取 `round` 平均；`age = year - avg_year`。

- [ ] **Step 4: 跑測試確認通過。**

- [ ] **Step 5: Commit** — `feat(recap): 年份歸屬、時間估算、類別與故事年齡統計`

---

### Task 3: 統計純函式（二）月份、年度之最、開始結束、心得（1.5 後半）

**Files:**
- Modify: `server/app/services/recap_stats.py`
- Test: `server/tests/test_recap_stats.py`

**Interfaces:**
- Consumes: Task 2 的 `effective_date`。
- Produces：
  - `monthly_counts(rows) -> List[int]`：長度 12，依 `effective_date` 的月份
  - `months_active(counts: List[int]) -> Optional[dict]`：有收藏的月份數 ≥ 2 才回傳 `{"count": n}`，否則 None
  - `peak_month(counts: List[int]) -> Optional[dict]`：最高月 ≥ 2 才回傳 `{"month": 1–12, "count": n}`；同分取較早的月份
  - `top_rated(rows) -> Optional[dict]`：只看 `rating > 0`；`{"rating": 最高分, "count": 該分數的列數, "items": [{"title", "poster_path"}, …最多 3 筆]}`，items 取日期最近者；無評分列則 None
  - `first_last(rows) -> Optional[dict]`：≥ 2 列才回傳 `{"first": item, "last": item}`，item＝`{"title", "poster_path", "date"}`，依 `(effective_date, created_at)` 排序
  - `pick_reflection(rows) -> Optional[dict]`：只計 `notes.strip()` 非空；回傳 `{"count": n, "candidates": [{"id","title","poster_path","rating","text"}, …最多 10]}`；排序＝評分高者優先、同分取心得較長、再同分取較近；`text` 為 `notes.strip()` 超過 40 字元時截成 40 字元加「…」

- [ ] **Step 1: 寫失敗測試**
  - 月份：三筆分別在 3 月、3 月、7 月 → `counts[2]==2, counts[6]==1`；`months_active == {"count": 2}`；只有一個月有收藏 → None。
  - `peak_month`：最高月只有 1 部 → None；3 月與 5 月都是 2 部 → `month == 3`。
  - `top_rated`：評分 `[0, 0, 8, 10, 10, 10, 10]` → `rating == 10, count == 4, len(items) == 3`；**全部評分為 0 → None**（Review Focus 5）。
  - `first_last`：1 列 → None；3 列 → first 為最早日期、last 為最晚；同日以 `created_at` 排序。
  - 心得：`notes="   "` 與 `None` 不計；唯一一則空白心得 → None；兩則心得、評分 9（短）與 7（長）→ 第一候選為評分 9 者；全部評分 0 → 第一候選為最長；超過 40 字 → `text` 長度為 41 且以「…」結尾；候選最多 10。

- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**上述函式。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(recap): 月份節奏、年度之最、開始與結束、心得統計`

---

### Task 4: 稱號（1.6）與往年權限（1.7）

**Files:**
- Create: `server/app/services/recap_titles.py`、`server/app/services/recap_access.py`
- Test: `server/tests/test_recap_titles.py`、`server/tests/test_recap_access.py`

**Interfaces:**
- Consumes: Task 2 的 `top_genres`、`story_age`、`time_summary`。
- Produces：
  - `TITLES: Dict[str, Dict[str, str]]`：鍵為稱號 id，值 `{"zh": …, "en": …}`
  - `select_title(rows: List[dict], year: int) -> Optional[dict]`：列數 < 5 回 None；否則回 `{"id", "zh", "en"}`
  - `can_view_recap_year(user_id: str, year: int) -> bool`：目前恆回 True（日後改成檢查訂閱的**唯一**判斷點）

**稱號草案（規則依序，第一個符合者勝出；皆為我的決定，文案待 Tu 審閱）：**

| 順序 | id | zh | en | 條件 |
|---|---|---|---|---|
| 1 | `midnight_wanderer` | 午夜漫遊者 | The Midnight Wanderer | 第一名類別（不分大小寫）為 `horror` 或 `thriller` 或 `mystery` |
| 2 | `star_voyager` | 星際旅人 | The Star Voyager | `science fiction`、`sci-fi & fantasy`、`fantasy` |
| 3 | `joy_maker` | 快樂製造機 | The Joy Maker | `comedy` |
| 4 | `heart_collector` | 情感收藏家 | The Heart Collector | `drama` |
| 5 | `forever_young` | 童心未泯 | The Forever Young | `animation`、`family` |
| 6 | `explorer` | 探索者 | The Explorer | `documentary`、`history` |
| 7 | `romantic` | 浪漫派 | The Romantic | `romance` |
| 8 | `old_soul` | 老靈魂 | The Old Soul | `story_age` 存在且 `age >= 20` |
| 9 | `bookworm` | 書海漫遊者 | The Bookworm | 數量最多的媒體類型為 `book` |
| 10 | `series_voyager` | 追劇旅人 | The Series Voyager | 最多為 `tv` |
| 11 | `cinephile` | 銀幕常客 | The Cinephile | 最多為 `movie` |
| 12 | `story_keeper` | 故事守護者 | The Story Keeper | 以上皆不符（保底） |

媒體類型同數量時優先序 `movie > tv > book`。「最投入月份」未納入規則（設計列為輸入，但草案不需要它；Tu 若要再加）。

- [ ] **Step 1: 寫失敗測試**
  - 5 列、第一名類別 Horror → `id == "midnight_wanderer"`；類別大小寫 `HORROR` 同結果。
  - 無類別資料、平均年份使 `age == 21` → `old_soul`；無類別、近年作品、書最多 → `bookworm`；全部無類別無年份、電影 2 部 tv 2 部 → `cinephile`（同數量優先序）。
  - 4 列 → None。
  - 決定性：同輸入兩次結果相等；每個 `TITLES` 值都有非空 `zh` 與 `en`；`len(TITLES) == 12`。
  - `can_view_recap_year("u", 2020) is True`。

- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**（規則表以資料結構定義，非一串 if）。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(recap): 規則式稱號表與往年權限判斷點`

---

### Task 5: 補抓缺資料（1.4）

**Files:**
- Create: `server/app/services/recap_backfill.py`
- Test: `server/tests/test_recap_backfill.py`

**Interfaces:**
- Produces：
  - `needs_backfill(row: dict) -> bool`：`genres` 為 None／空；或 movie／tv 缺 `runtime_minutes`；或 tv 缺 `episode_total`；或 book 缺 `page_count`
  - `extract_metadata(details: ItemDetailResponse, row: dict) -> dict`：只回傳取得到的鍵（`runtime_minutes`、`episode_total`、`genres`、`page_count`）。電影／影集的 `details.runtime` 形如 `"129m"`，以正規式取數字；書用 `details.page_count`；tv 的 `episode_total`＝`row["seasons"]` 有值時加總 `details.seasons` 中對應 `season_number` 的 `episode_count`，沒有 `seasons` 時加總全部季；任何 `episode_count` 為 None 則 `episode_total` 不回傳；`genres` 取 `details.genres`
  - `async backfill_rows(rows: List[dict], fetch: Callable[[dict], Awaitable[Optional[dict]]], save: Callable[[str, dict], Awaitable[None]], concurrency: int = 5, budget_seconds: float = 8.0) -> int`：對需要補抓的列依 `(media_type, external_id, tuple(seasons or []))` 分組、每組只 `fetch` 一次；`fetch` 回傳要寫的欄位 dict（None 或例外＝失敗＝無資料）；成功時**就地更新**組內每列的缺值欄位（已有值不覆蓋）並對每列 `await save(row["id"], fields)`；整體超過預算時取消未完成者，回傳**尚未完成的列數**（失敗者不計入）

- [ ] **Step 1: 寫失敗測試**（`fetch`／`save` 用 `AsyncMock`／自製 async 函式）
  - `needs_backfill`：電影有 runtime 與 genres → False；電影缺 genres → True；tv 有 runtime 缺 episode_total → True；書缺 page_count → True。
  - `extract_metadata`：`runtime="129m"` → `runtime_minutes == 129`；tv `seasons=[2]` 且 details.seasons 為 S1 8 集、S2 10 集 → `episode_total == 10`；tv `seasons=None` → 18；任一季 `episode_count=None` → 不含 `episode_total`；書 → `page_count`；`runtime="? pages"` 之類無法解析 → 不含 `runtime_minutes`。
  - 同一作品兩列（重看）→ `fetch` 只被呼叫 1 次、`save` 被呼叫 2 次，兩列 in-place 更新（Review Focus 4）。
  - 已有 `runtime_minutes` 的列，`fetch` 回傳不同值 → 不覆蓋。
  - 某一組 `fetch` 丟例外 → 其他組仍完成、回傳 0、失敗列欄位仍為 None。
  - 預算：`budget_seconds=0.05`，`fetch` 睡 1 秒 → 回傳值等於未完成列數（> 0），不拋例外。
  - 並行：`concurrency=2` 時任一時刻同時執行的 `fetch` 不超過 2（用計數器驗證）。
  - 全部列都不需要補抓 → 不呼叫 `fetch`，回傳 0。

- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**（`asyncio.Semaphore` 控並行，`asyncio.wait(..., timeout=budget_seconds)` 控預算，逾時對 pending task `cancel()` 並 `await` 收尾）。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(recap): 舊收藏作品資料補抓（有限並行、時間預算）`

---

### Task 6: Recap 回應 schema 與 `RecapService.build_recap`（1.8 核心）

**Files:**
- Create: `server/app/schemas/recap.py`、`server/app/services/recap_service.py`
- Test: `server/tests/test_recap_service.py`

**Interfaces:**
- Consumes: Task 1 repo 方法、Task 2–5 的函式、`SearchService.get_item_details(client, media_type, external_id, language)`（補抓以 `"en-US"`）。
- Produces：
  - `RecapResponse`（Pydantic）：`year: int`、`is_partial: bool`（`year == today.year`）、`total_count: int`、`metadata_pending: int`，以及各場景欄位（型別皆為 `Optional[dict]`，除 `opening`、`total`、`closing` 為必有）：`opening`（`{"year"}`）、`total`、`movies`、`series`、`books`、`genres`（`{"top": […]}`）、`story_age`、`title`、`monthly`（`{"counts": [12 個整數]}`）、`peak_month`、`months_active`、`top_rated`、`first_last`、`reflection`、`closing`（`{}`）
  - `class NotEnoughStories(Exception)`：屬性 `needed: int`、`count: int`
  - `class RecapForbidden(Exception)`
  - `class RecapService`：`__init__(self, token: str = None)`；`async build_recap(self, user_id: str, year: int, today: date) -> RecapResponse`；`list_years(self, user_id: str) -> dict`（`{"threshold": 3, "years": [{"year": int, "count": int}, …]}`，年份遞減，僅含 ≥ 3 筆且 `can_view_recap_year` 為真者）
  - 場景出現條件（不足即 None）：`movies`／`series`／`books`＝該媒體類型 ≥ 1 列，內容為 `time_summary` 加 `count`，series 另含 `episodes`（有 `episode_total` 的列加總）、books 另含 `pages`；`total`＝全年 `time_summary`；`genres`＝`top_genres`；`story_age`、`title`（`select_title`）、`monthly`＋`months_active` 需 ≥ 2 個月有收藏（否則兩者皆 None）、`peak_month`、`top_rated`、`first_last`、`reflection` 依 Task 2–4 函式回傳

- [ ] **Step 1: 寫失敗測試**（mock repo 的 `get_recap_rows`；補抓以 patch `recap_service` 內的 backfill 函式或注入 fake `fetch`）
  - 該年 2 列 → 拋 `NotEnoughStories`（`needed == 1, count == 2`）。
  - `can_view_recap_year` 被 patch 成 False → 拋 `RecapForbidden`（且在讀列／補抓之前）。
  - 3 列（2 部電影＋1 本書，其他年份另有 5 列不應被計入）→ `total_count == 3`；`movies.count == 2`、`series is None`、`books.count == 1`；`genres is None`（類別資料不足）；`story_age`、`title`、`first_last`…依資料齊備與否為 None 或物件；`opening == {"year": 年}`、`closing == {}`。
  - 全部列都沒有片長／頁數 → `total.minutes == 0 and total.items_with_data == 0`，不拋例外（Review Focus：缺資料不得變成假數字）。
  - `is_partial`：`year == today.year` 為 True，去年為 False。
  - 補抓：缺資料的列被補抓後 `total.minutes` 反映新資料，且 `repo.update_recap_metadata` 以 `await` 完成（用 fake 非同步 save 驗證已被 await）；超過預算時 `metadata_pending > 0` 且仍回傳結果。
  - 回傳資料只含該 `user_id` 的列（repo 以 `user_id` 呼叫）。
  - `list_years`：列分佈 2024 年 2 筆、2025 年 3 筆、2026 年 5 筆 → `[{"year": 2026, "count": 5}, {"year": 2025, "count": 3}]`；`can_view_recap_year` 對 2025 回 False → 不含 2025。

- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作** `RecapService`；`build_recap` 流程：`can_view_recap_year` → `get_recap_rows` → `rows_in_year` → 不足門檻拋例外 → `backfill_rows`（`fetch` 內用單一 `httpx.AsyncClient` 呼叫 `SearchService.get_item_details(...,"en-US")` 後 `extract_metadata`；`save` 內以 `loop.run_in_executor` 呼叫 `repo.update_recap_metadata` 並 `await`）→ 以更新後的列計算各場景。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(recap): RecapService 組裝 15 個場景資料`

---

### Task 7: Endpoints（1.8、1.9 的 HTTP 層）

**Files:**
- Modify: `server/app/api/v1/endpoints/collection.py`
- Test: `server/tests/test_recap_api.py`

**Interfaces:**
- Consumes: `RecapService`、`NotEnoughStories`、`RecapForbidden`、`RecapResponse`。
- Produces：`GET /api/v1/collection/recap?year=YYYY`（`async def`，`year: int = Query(ge=1970, le=2100)`，回 `RecapResponse`）與 `GET /api/v1/collection/recap/years`（回 `dict`）；兩者宣告在 `/{story_id}` 之前；`NotEnoughStories` → 404 `detail={"code": "recap_not_enough", "needed": n, "count": c}`；`RecapForbidden` → 403。

- [ ] **Step 1: 寫失敗測試**（沿用 `test_monthly_stats.py` 的 `TestClient` 與 `app.dependency_overrides[get_current_user]`；patch `RecapService.build_recap`／`list_years`）
  - `GET /api/v1/collection/recap?year=2026` → 200、body 含 `year`、`opening`、`closing`；service 被以 `(user.id, 2026, today)` 呼叫。
  - 不帶 `year` → 422；`year=1900` → 422。
  - service 拋 `NotEnoughStories(needed=2, count=1)` → 404 且 `detail["needed"] == 2`。
  - 拋 `RecapForbidden` → 403。
  - `GET /api/v1/collection/recap/years` → 200（**不是 422**，驗證沒被 `/{story_id}` 遮蔽；Review Focus 2），body 為 service 回傳值。
  - 未帶 Authorization → 401／403（沿用既有 `get_current_user` 行為）。
  - 匿名（`is_anonymous=True`）用戶同樣可呼叫。

- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作** 兩個 endpoint，只做參數、例外轉 HTTP、呼叫 service。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(recap): GET /collection/recap 與 /recap/years`

---

### Task 8: 全套驗證與交接（1.10）

**Files:** 無新增；更新 `openspec/changes/year-recap/tasks.md` 勾選 1.1–1.10；若需要，更新 `docs/StorioWiki.md`（新增 Recap 後端模組一行說明）與 `docs/BACKLOG.md`。

- [ ] **Step 1: 跑後端全套（CI dummy env、乾淨環境）**：

```bash
cd server
env -i PATH="$PATH" SUPABASE_URL="https://dummy.supabase.co" SUPABASE_ANON_KEY="dummy-anon-key" \
  SUPABASE_SERVICE_KEY="dummy-service-key" TMDB_API_KEY="dummy-tmdb-key" python3 -m pytest -q
```
預期：全部通過（既有測試數 ＋ 本計畫新增）。若本機 `server/.env` 干擾，依 `feedback_ci_env_isolation`（記憶）暫時移走後再跑。
- [ ] **Step 2: 本機煙霧測試**：啟動 backend，用 dev 帳號 token 請求 `/api/v1/collection/recap/years` 與 `/recap?year=…`，確認 migration 未執行時 `recap` 回應能順利（`get_recap_rows` 的 select 會因欄位不存在而失敗，這是預期；驗證失敗訊息清楚，並確認既有 `GET /collection/` 與 `POST /collection/` 在 migration 未跑時仍正常——對應 Review Focus 1）。
- [ ] **Step 3: 勾選 tasks.md、提交** — `docs(openspec): year-recap 階段 1 任務完成`。
- [ ] **Step 4: 交接給 Tu（不由 Claude 執行）**：(a) 在 Supabase **dev** 專案執行 `009_recap_metadata.sql`，再執行檔內驗證查詢；(b) dev 驗證通過後在 **prod** 執行；(c) 通知 Claude 後再做 `/review`、合併、Railway 部署。
