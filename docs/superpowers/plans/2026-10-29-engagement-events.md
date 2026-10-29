# 互動事件記錄與匿名帳號灌水修正 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 記錄六種互動事件（分平台、每日去重）以計算 engagement rate，並讓分享圖服務與已知爬蟲不再建立匿名帳號。

**Architecture:** 後端新增 `engagement_events` 表與 `POST /api/v1/events`（endpoint → service → repository，service-role 寫入，平台由 `Origin` 判斷）；`add_collection` 由後端在新增收藏成功後記錄。前端新增 `botDetection` 擋住爬蟲的匿名登入，`analytics.track()` 集中上報其餘五種事件。報表以 `ops` views 給 Looker。

**Tech Stack:** FastAPI 0.162 + slowapi + supabase-py 2.28（postgrest 2.28）；Next.js 14.2.35 + Zustand + Capacitor 7；pytest、vitest 4 + @testing-library/react。

**Spec:** `docs/superpowers/specs/2026-10-29-engagement-events-design.md`（已核可）；需求情境見 `openspec/changes/add-engagement-events/specs/*/spec.md`。執行者兩份都要讀。

## Global Constraints

- 所有註解、文件、commit 訊息用繁體中文；commit 結尾加：
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 與 `Claude-Session: https://claude.ai/code/session_01Q52qJHs7FhvYUXZvXzL48n`
- 事件值只有：`open`、`browse`、`detail_view`、`search`、`add_collection`、`share`。
- 平台只有：`ios`、`android`、`web`；`capacitor://localhost` → `ios`、`https://localhost` → `android`、其他或缺 → `web`。前端送的平台值不寫入。
- `bot_reason` 寫入值只有 `user_agent`、`webdriver`（`render_service` 只在前端用，不送）。
- 爬蟲 UA 樣式（不分大小寫，照抄）：`bot|crawler|spider|crawling|headlesschrome|lighthouse|google-inspectiontool|googleother|facebookexternalhit|slurp|bingpreview|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|perplexitybot|applebot|bytespider|ccbot|amazonbot|semrush|ahrefs|petalbot|yandex|duckduckbot|baiduspider`
- 去重單位：主體（`user_id` 或 `visitor_id`）＋事件＋平台＋ UTC 日。
- `/api/v1/events` 限流 `60/minute`（共用 `app.core.limiter.limiter`）。
- 不記搜尋字串、作品 ID、心得、IP 原文、UA 原文。
- 事件寫入必須同步完成（sync endpoint 或 `await run_in_executor`），禁止 fire-and-forget。
- 不修改 `clear_user_data()`、`migrate_guest_data`、migration 004／005。
- 真人與原生 App 的 UI、登入流程不得有任何變化；上報失敗一律靜默。
- 後端測試用 dummy env 且移走 `server/.env`（見 `docs/DEV_SETUP.md` §5）；前端 push 前跑 `cd client && npx next lint`；iOS 只用 `npm run build:ios`。

## 計畫層的決定（spec 未定、此處拍板）

1. **去重實作**：保留 spec 的 `coalesce(user_id, visitor_id)` 唯一索引；repository 直接 `insert`，捕捉 PostgREST `APIError` 且 `code == "23505"` 視為成功（PostgREST 的 `on_conflict` 無法指定運算式索引）。
2. **`add_collection` 掛點**：collection endpoint 知道 `Origin`，service 不知道。由 `add_to_collection` endpoint 在 `service.add_story()` 成功後呼叫 `EventService.record_safely(...)`（吞例外只記 log）。`CollectionService` 簽名不變。
3. **帶了 token 但無效**：回 `401`（前端靜默），不降級成訪客。
4. **有 token 時**：一律 `is_suspected_bot = false`、`bot_reason = null`、`visitor_id = null`。
5. **週 engagement rate 的分子**只算「同週也有 `open` 的主體」，所以比率不會超過 1（符合 spec「10 人中 4 人」情境；舊版 App 只有 `add_collection` 沒有 `open` 的人不進比率，但仍進「真實用戶」）。
6. **「auth 有結果」的判斷**：`useUserStore` 新增 `anonSignInFailed: boolean`。`open` 在 `!loading && (token || isBot || anonSignInFailed)` 時才送，避免 `fetchSession` 先把 `loading` 設成 false 時誤送訪客 `open`。
7. **`track` 讀 token 用 `useUserStore.getState()`**，不經參數（避免 stale closure，見記憶 feedback_notif_stale_closure_token）。
8. **`detail_view` 掛點**：`/details` 詳情載入成功、`/collection/item` 收藏項目載入成功。搜尋頁的 `openAddModal` 抓詳情不算（那是準備新增）。
9. **`share` 掛點**：兩個 modal 的 `handleShare` 成功路徑（系統分享面板 resolve、`navigator.share` resolve、或下載 fallback），以及 `handleDownload`。使用者取消（reject）不算；catch 內的下載 fallback 不算。

## Review Focus

1. **首訪真人的 `open` 被記兩次**（先記訪客、登入後又記帳號）→ 應只記一次、記在 `user_id`。由 Task 5 的 `useOpenTracking` 測試 `does not send visitor open while anonymous sign-in is pending` 釘住。
2. **爬蟲頁面卡在轉圈**：bot 時 `loading` 必須變 false 且 `user` 為 null → Task 4 測試 `bot: no anonymous sign-in and loading ends`。
3. **`localStorage` 不可用**（Safari 私密模式、爬蟲禁用儲存）→ `track` 不得丟例外；訪客代號改用本次記憶體值 → Task 5 測試 `storage throws: still sends without crashing`。
4. **重複事件被當錯誤**（23505 讓 API 回 500）→ 應回 204 → Task 2 測試 `test_duplicate_event_returns_204`。
5. **事件表寫入失敗讓新增收藏失敗** → 收藏照回 200 → Task 3 測試 `test_add_collection_survives_event_failure`。

---

### Task 1: Migration 006（資料表與報表 views）

**Files:**
- Create: `server/migrations/006_engagement_events.sql`

**Interfaces:**
- Produces: 表 `public.engagement_events(id uuid pk default gen_random_uuid(), day date not null, event text not null, platform text not null, user_id uuid null references auth.users(id) on delete cascade, visitor_id uuid null, is_suspected_bot boolean not null default false, bot_reason text null, created_at timestamptz not null default now())`；views `ops.v_engagement_daily`、`ops.v_engagement_rate_weekly`、`ops.v_real_users`。

- [ ] **Step 1: 寫 SQL**（比照 `003`／`005` 檔頭格式：背景、執行方式、冪等說明）
  - `create table if not exists`；check：`event in (六種)`、`platform in ('ios','android','web')`、`bot_reason is null or bot_reason in ('user_agent','webdriver')`、`num_nonnulls(user_id, visitor_id) = 1`。
  - `create unique index if not exists engagement_events_dedupe on public.engagement_events (coalesce(user_id, visitor_id), event, platform, day);`
  - `alter table ... enable row level security;`（不建 policy）；`revoke all on public.engagement_events from anon, authenticated;`
  - `ops.v_engagement_daily`：欄位 `day, platform, event, is_suspected_bot, subjects`（`count(distinct coalesce(user_id, visitor_id))`）。
  - `ops.v_engagement_rate_weekly`：只取 `is_suspected_bot = false`；欄位 `week`（`date_trunc('week', day)::date`）、`platform, event, subjects, open_subjects, rate`；`subjects` 只算同週同平台也有 `open` 的主體；`rate = subjects::numeric / nullif(open_subjects, 0)`，取到小數 4 位。
  - `ops.v_real_users`：單列 `real_users_7d, real_users_30d`；主體 = 期間內（`created_at >= now() - interval '7 days'`／`'30 days'`）非 bot 事件的 `coalesce(user_id, visitor_id)` ∪ `public.collections.user_id`（`created_at` 同窗）去重計數。
  - 三個 view：`revoke all ... from public, anon, authenticated; grant select ... to looker_ro;`
  - 檔尾附驗證 SQL（註解）：插入一筆測試列再刪除、`select * from ops.v_real_users;`、`set role looker_ro; select * from public.engagement_events;` 應被拒、`reset role;`。

- [ ] **Step 2: 自查**：`create or replace view` 欄位順序固定、全檔可重複執行（第二次執行不報錯）。無本機 Postgres，語法由 Task 7 在 dev Supabase 實跑驗證。

- [ ] **Step 3: Commit** — `feat(db): migration 006 engagement_events 與 ops 互動 views`

---

### Task 2: 後端事件 API

**Files:**
- Create: `server/app/schemas/event.py`、`server/app/repositories/event_repo.py`、`server/app/services/event_service.py`、`server/app/api/v1/endpoints/events.py`、`server/tests/test_events_api.py`
- Modify: `server/app/api/deps.py`（新增選用驗證）、`server/app/api/api_v1.py`（掛 router）

**Interfaces:**
- Produces:
  - `EngagementEvent = Literal["open","browse","detail_view","search","add_collection","share"]`；`ApiEvent = Literal["open","browse","detail_view","search","share"]`；`EventCreate(BaseModel)`：`event: ApiEvent`（不含 `add_collection`，送了即 422）、`visitor_id: Optional[UUID] = None`、`is_suspected_bot: bool = False`、`bot_reason: Optional[Literal["user_agent","webdriver"]] = None`。
  - `deps.optional_security = HTTPBearer(auto_error=False)`；`get_optional_user(credentials = Depends(optional_security), supabase = Depends(get_supabase_client)) -> Optional[User]`：無憑證回 `None`，無效回 401。
  - `platform_from_origin(origin: Optional[str]) -> str`（`event_service.py`）。
  - `EventRepository().insert_event(row: dict) -> None`：用 `get_supabase_client()`；23505 吞掉，其他例外往上拋。
  - `EventService(repo: EventRepository | None = None)`：`record(event: str, platform: str, *, user_id: Optional[str], visitor_id: Optional[UUID] = None, is_suspected_bot: bool = False, bot_reason: Optional[str] = None) -> None`（寫入 `day = datetime.now(timezone.utc).date().isoformat()`）；`record_safely(...)` 同參數，吞例外並 `logger.error`。
  - `POST /api/v1/events`：sync `def`，`@limiter.limit("60/minute")`，`status_code=204`。

- [ ] **Step 1: 寫失敗測試** `server/tests/test_events_api.py`。以 `mp.setattr("app.api.v1.endpoints.events.EventService", ...)` 或 patch `EventRepository.insert_event` 攔截寫入；token 情境用 `app.dependency_overrides[get_optional_user]`；每個測試結尾清 overrides。
  - `test_valid_event_with_token_returns_204`：`detail_view` + 使用者 → 204，寫入列 `user_id == <id>`、`visitor_id is None`、`is_suspected_bot is False`。
  - `test_unknown_event_returns_422`：`purchase` → 422，未寫入。
  - `test_add_collection_rejected_from_api`：`add_collection` → 422。
  - `test_token_ignores_visitor_id`：帶 token 與 `visitor_id` → 寫入 `visitor_id is None`。
  - `test_no_token_open_with_visitor_id`：無 token、`open`、UUID、`is_suspected_bot=True`、`bot_reason="user_agent"` → 204，列含這三值、`user_id is None`。
  - `test_no_token_non_open_rejected`：無 token、`search` → 401，未寫入。
  - `test_no_token_missing_visitor_id_rejected`：無 token、`open`、無 visitor_id → 422。
  - `test_invalid_token_returns_401`：`Authorization: Bearer bad`，patch `get_supabase_client` 讓 `auth.get_user` 丟例外 → 401。
  - 參數化 `test_platform_from_origin`：`capacitor://localhost`→`ios`、`https://localhost`→`android`、`https://storio.andismtu.com`→`web`、`None`→`web`；另測 endpoint 送 `Origin: capacitor://localhost` 時寫入 `platform == "ios"`。
  - `test_duplicate_event_returns_204`：repository 層測試，mock client 的 `insert().execute()` 丟 `APIError({"code": "23505", "message": "dup"})` → `insert_event` 不拋；丟 `code "500"` 的 APIError → 會拋。
  - `test_events_rate_limit`：同 `X-Forwarded-For` 送 61 次，前 60 次非 429、第 61 次 429（比照 `test_rate_limiting.py`）。
  - `test_day_is_utc`：patch `event_service.datetime` 固定在 `2026-10-29T23:30:00-08:00` → 寫入 `day == "2026-10-30"`。
  - `test_row_contains_only_allowed_keys`：寫入 dict 的 key 集合 == `{"day","event","platform","user_id","visitor_id","is_suspected_bot","bot_reason"}`。

- [ ] **Step 2: 跑測試確認失敗** — `cd server && <venv>/bin/pytest tests/test_events_api.py -v`（dummy env、`.env` 移開）→ import 失敗。

- [ ] **Step 3: 實作** schema、`get_optional_user`、repository、service、endpoint，並在 `api_v1.py` 加 `api_router.include_router(events.router, prefix="/events", tags=["events"])`。endpoint：有使用者 → `record(event, platform, user_id=user.id)`；無使用者 → `event != "open"` 回 401、缺 `visitor_id` 回 422，否則以訪客寫入。`visitor_id` 寫入前轉 `str`。

- [ ] **Step 4: 跑測試確認通過**，再跑全套 `pytest -q` 無退步。

- [ ] **Step 5: Commit** — `feat(api): POST /api/v1/events 互動事件記錄`

---

### Task 3: 後端記錄 add_collection

**Files:**
- Modify: `server/app/api/v1/endpoints/collection.py`（`add_to_collection`）
- Test: `server/tests/test_collection_api.py`

**Interfaces:**
- Consumes: `EventService.record_safely(...)`、`platform_from_origin(...)`（Task 2）。

- [ ] **Step 1: 寫失敗測試**（沿用該檔既有 override＋MonkeyPatch 寫法，另外 patch `app.api.v1.endpoints.collection.EventService`）
  - `test_add_collection_records_event`：`Origin: capacitor://localhost` 新增成功 → `record_safely` 被呼叫一次，參數 `("add_collection", "ios", user_id=<id>)`。
  - `test_add_collection_survives_event_failure`：用真的 `EventService`，但 patch `EventRepository.insert_event` 丟 `RuntimeError` → 回 200、body 是新增的項目，且 `caplog` 有 error 紀錄。
  - `test_failed_add_does_not_record_event`：`add_story` 丟 `HTTPException(409)` → 回 409，`record_safely` 未被呼叫。

- [ ] **Step 2: 跑測試確認失敗。**

- [ ] **Step 3: 實作** — `add_to_collection` 加 `request: Request` 參數；`result = service.add_story(...)` 後呼叫 `EventService().record_safely("add_collection", platform_from_origin(request.headers.get("origin")), user_id=user.id)`，再 `return result`。

- [ ] **Step 4: 跑全套 pytest**，並 `git diff` 確認 `collection_service.py` 的 `clear_user_data` 與 `user.py` 的 `DELETE /me/data` 未被修改。

- [ ] **Step 5: Commit** — `feat(api): 新增收藏成功後記錄 add_collection 事件`

---

### Task 4: 前端爬蟲判斷與 useAuth 根因修正

**Files:**
- Create: `client/src/lib/botDetection.ts`、`client/src/lib/__tests__/botDetection.test.ts`、`client/src/hooks/__tests__/useAuth.test.ts`
- Modify: `client/src/hooks/useAuth.ts`、`client/src/store/userStore.ts`

**Interfaces:**
- Produces:
  - `type BotReason = 'render_service' | 'webdriver' | 'user_agent'`
  - `detectBot(): { isBot: boolean; reason: BotReason | null }`（讀 `Capacitor.isNativePlatform()`、`window.location.pathname`、`navigator.webdriver`、`navigator.userAgent`；SSR／無 `window` 時回 `{ isBot: false, reason: null }`）。判斷順序：native → render_service → webdriver → user_agent。`/share/render` 以 `pathname.startsWith('/share/render')` 判斷。
  - `useUserStore` 新增 `anonSignInFailed: boolean`（預設 false）與 `setAnonSignInFailed(v: boolean)`。

- [ ] **Step 1: 寫失敗測試 `botDetection.test.ts`**（`// @vitest-environment jsdom`；mock `@capacitor/core` 的 `isNativePlatform`；用 `Object.defineProperty(navigator, 'userAgent' | 'webdriver', { value, configurable: true })` 與 `window.history.pushState({}, '', path)`）
  - Googlebot UA → `{ isBot: true, reason: 'user_agent' }`；`GPTBot`、`ClaudeBot`、`HeadlessChrome` 各一例同上（大小寫混用）。
  - 一般 Chrome UA + `webdriver = true` → `reason: 'webdriver'`。
  - 路徑 `/share/render` → `reason: 'render_service'`（即使 UA 正常）。
  - native = true + Googlebot UA + `/share/render` → `{ isBot: false, reason: null }`。
  - iPhone Safari UA、`webdriver = false`、路徑 `/` → `{ isBot: false, reason: null }`。

- [ ] **Step 2: 寫失敗測試 `useAuth.test.ts`**（jsdom；mock `@/lib/supabase`：`auth.getSession` 回 `{ data: { session: null } }`、`auth.signInAnonymously`、`auth.onAuthStateChange` 回 `{ data: { subscription: { unsubscribe: vi.fn() } } }`；mock `@/lib/botDetection`；每個測試前 `useUserStore.setState({ user: null, token: null, loading: true, anonSignInFailed: false })`；`renderHook(() => useAuth())` + `waitFor`）
  - `bot: no anonymous sign-in and loading ends`：`detectBot` 回 bot → `signInAnonymously` 未被呼叫，`loading === false`、`user === null`。
  - `real visitor: anonymous sign-in as before`：非 bot → `signInAnonymously` 被呼叫一次。
  - `sign-in error sets anonSignInFailed`：`signInAnonymously` 回 `{ data: {}, error: new Error('x') }` → `anonSignInFailed === true`、`loading === false`。

- [ ] **Step 3: 跑兩個測試檔確認失敗** — `cd client && npx vitest run src/lib/__tests__/botDetection.test.ts src/hooks/__tests__/useAuth.test.ts`

- [ ] **Step 4: 實作** `botDetection.ts`；`userStore` 加欄位；`useAuth.initAuth` 在 `!session` 時先 `detectBot()`，是 bot 就 `setLoading(false)` 後 return；`signInAnonymously` 成功時 `setAnonSignInFailed(false)`、catch 內 `setAnonSignInFailed(true)`。其他路徑不動。

- [ ] **Step 5: 跑測試確認通過**，再跑 `npm test` 全套。

- [ ] **Step 6: 檢查依賴 token 的頁面**：`git grep -n "useAuth()" client/src` 列出所有使用處，逐一確認在 `user === null && loading === false && token === null` 時不會無限轉圈或丟例外（首頁、館藏、搜尋、Profile、`HomeStats`／`HeroStats`）。有問題就在該元件補「無 token 不打 API」的守衛，並在本 task 補對應測試；沒問題就在 commit 訊息寫明已檢查的檔案。

- [ ] **Step 7: Commit** — `fix(auth): 分享圖服務與已知爬蟲不再建立匿名帳號`

---

### Task 5: 前端事件上報模組

**Files:**
- Create: `client/src/lib/analytics.ts`、`client/src/lib/__tests__/analytics.test.ts`、`client/src/hooks/useEngagementTracking.ts`、`client/src/hooks/__tests__/useEngagementTracking.test.ts`

**Interfaces:**
- Consumes: `detectBot()`、`useUserStore`（含 `anonSignInFailed`）（Task 4）；`getApiUrl()`（`lib/api.ts`）。
- Produces:
  - `type ClientEvent = 'open' | 'browse' | 'detail_view' | 'search' | 'share'`
  - `track(event: ClientEvent): void` — 不回 Promise、永不丟例外。流程：`detectBot().reason === 'render_service'` → 不送；有 `token`（`useUserStore.getState()`）→ 主體為 `user.id`，帶 `Authorization: Bearer`；無 token 且 `event === 'open'` → 主體為 `getVisitorId()`，body 帶 `visitor_id`、`is_suspected_bot`、`bot_reason`；其他情況不送。本機 key `storio_evt_${event}_${subject}` 存 UTC 日期（`new Date().toISOString().slice(0, 10)`），同日已送則略過；送出前先寫 key。`fetch(getApiUrl('/api/v1/events'), { method: 'POST', keepalive: true, ... })`，`.catch(() => {})`。
  - `getVisitorId(): string` — localStorage key `storio_visitor_id`，無則 `crypto.randomUUID()` 存入；storage 丟例外時回模組層記憶體值。
  - `useOpenTracking(): void` — 條件 `!loading && (token || detectBot().isBot || anonSignInFailed)` 成立時 `track('open')`；native 另以 `App.addListener('appStateChange', ({ isActive }) => isActive && track('open'))`。
  - `useBrowseTracking(): void` — 掛 `scroll`、`wheel`、`touchstart`（`{ passive: true }`）於 `window`，第一次觸發 `track('browse')` 並移除全部監聽；unmount 時移除。

- [ ] **Step 1: 寫失敗測試 `analytics.test.ts`**（jsdom；`vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))`；mock `@/lib/botDetection`；每測前 `localStorage.clear()` 與重設 store；`vi.setSystemTime` 固定日期）
  - `sends with bearer token for signed-in user`：fetch 一次，header `Authorization: Bearer t1`，body `{ event: 'search' }` 不含 `visitor_id`。
  - `same subject same day skips`：連送兩次 `detail_view` → fetch 一次；改到隔天 → 再送一次。
  - `subject change sends again`：先無 token 送 `open`（訪客），再設 token 送 `open` → fetch 兩次。
  - `no token non-open is dropped`：無 token 送 `search` → fetch 未被呼叫。
  - `bot open carries visitor and reason`：`detectBot` 回 `{ isBot: true, reason: 'user_agent' }` → body 含 UUID 格式 `visitor_id`、`is_suspected_bot: true`、`bot_reason: 'user_agent'`；再送一次的 `visitor_id` 相同。
  - `render_service sends nothing`：reason `render_service` → fetch 未被呼叫。
  - `network failure is silent`：fetch reject → `track` 不丟、無 unhandled rejection。
  - `storage throws: still sends without crashing`：`vi.spyOn(Storage.prototype, 'getItem' | 'setItem')` 丟例外 → 仍送出一次。

- [ ] **Step 2: 寫失敗測試 `useEngagementTracking.test.ts`**（jsdom；mock `@/lib/analytics` 的 `track`、`@/lib/botDetection`、`@capacitor/app`、`@/lib/appleAuth` 的 `isNativePlatform` 回 false）
  - `does not send visitor open while anonymous sign-in is pending`：store `{ loading: false, token: null, anonSignInFailed: false }`、非 bot → `track` 未被呼叫；接著 `setState({ token: 't' })` → `track('open')` 一次。
  - `bot sends open after auth resolves`：bot、`loading: false` → `track('open')`。
  - `sign-in failed real visitor sends open`：`anonSignInFailed: true` → `track('open')`。
  - `browse only after real interaction`：`renderHook(useBrowseTracking)` 不觸發 → 未呼叫；`window.dispatchEvent(new Event('scroll'))` 兩次 → `track('browse')` 一次。

- [ ] **Step 3: 跑測試確認失敗；Step 4: 實作；Step 5: 跑測試與 `npm test` 全套確認通過。**

- [ ] **Step 6: Commit** — `feat(client): 互動事件上報模組與 open／browse hooks`

---

### Task 6: 前端掛上五種事件

**Files:**
- Modify: `client/src/components/AppOpenReset.tsx`、`client/src/app/page.tsx`、`client/src/app/collection/page.tsx`、`client/src/app/details/page.tsx`、`client/src/app/collection/item/page.tsx`、`client/src/app/search/page.tsx`、`client/src/components/ShareModal.tsx`、`client/src/components/MonthlyRecapModal.tsx`
- Test: `client/src/components/__tests__/ShareModal.test.tsx`、`client/src/components/__tests__/MonthlyRecapModal.test.tsx`

**Interfaces:**
- Consumes: `track`、`useOpenTracking`、`useBrowseTracking`（Task 5）。

- [ ] **Step 1: 寫失敗測試**（兩個既有 modal 測試檔各加，沿用 `shareTestUtils.ts`；mock `@/lib/analytics`）
  - `records share after successful share`：分享成功路徑 → `track('share')` 一次。
  - `cancelled share is not recorded`：`Share.share`／`navigator.share` reject → `track` 未被呼叫。
  - `download records share`：點 Download → `track('share')`。

- [ ] **Step 2: 跑測試確認失敗。**

- [ ] **Step 3: 掛點**
  - `AppOpenReset`：元件內呼叫 `useOpenTracking()`（根 layout 已掛，網頁與原生都會執行）。
  - 首頁 `Home`、館藏頁 `CollectionPage`：呼叫 `useBrowseTracking()`。
  - `/details`：`setItem(data)` 後 `track('detail_view')`；`/collection/item`：載入成功 `setItem(data)` 後同上。
  - 搜尋頁 `fetchResults`：在 `setLoading(true)` 後 `track('search')`（空字串早退之後；fallback AI 不另記）。
  - 兩個 modal：`handleShare` 成功路徑（native `Share.share` 後、`navigator.share` 後、下載 fallback 後）與 `handleDownload` 加 `track('share')`。

- [ ] **Step 4: 跑測試確認通過，並跑 `npm test`、`npx next lint`、`npm run build`。** 預期全綠、lint exit 0。

- [ ] **Step 5: Commit** — `feat(client): 掛上 open／browse／detail_view／search／share 事件`

---

### Task 7: 整合驗證（本機）

前置：Tu 在 **dev** Supabase（`client/.env.local` 指向的專案）SQL Editor 執行 006；本機後端 `server/.env` 指向同一 dev 專案；啟動後端 8010、前端 3010、Puppeteer 4000（`FRONTEND_URL=http://localhost:3010`）。若 dev 專案已暫停，先請 Tu 恢復。

- [ ] **Step 1: 分享圖服務**：記下 dev `auth.users` 筆數 → 用 Puppeteer 服務渲染 ticket 與 3d 模板各一次 → 帳號數不變、`engagement_events` 無新列、圖片與 main 分支產生的基準以 PIL 像素比對無差異。
- [ ] **Step 2: 爬蟲 UA**：headless 瀏覽器設 UA 含 `Googlebot` 開首頁 → 帳號數不變、出現一列 `open` / `is_suspected_bot = true` / `bot_reason = user_agent`；頁面 HTML 含 JSON-LD 與 `<title>`、console 無錯誤、無無限轉圈（截圖存證）。
- [ ] **Step 3: 真人瀏覽器**（gstack browse，無 webdriver 旗標；若工具會設 webdriver 則改用 Claude in Chrome）：清空儲存 → 開首頁 → 新增一個匿名帳號、`open` 記在該 `user_id`（只有一列，無訪客列）→ 依序滾動、開詳情、搜尋、新增收藏、分享 → 六種事件各一列、`platform = web`。
- [ ] **Step 4: iOS 模擬器**：`npm run build:ios`（暫時改指向本機後端的方式見 `docs/DEV_SETUP.md`）→ 走一輪核心動線 → UI 無變化、事件 `platform = ios`。
- [ ] **Step 5: 記錄結果**於 `tasks.md` 勾選，並把截圖路徑寫進 PR 說明。

---

### Task 8: 部署、報表與文件

- [ ] **Step 1: 跑 /qa、verification、/review**（CLAUDE.md 完成階段），修正後合回 main。
- [ ] **Step 2: Tu 在 prod 執行 006**，回報檔尾驗證 SQL 結果。
- [ ] **Step 3: push 後端**（經 Tu 同意）→ `railway deployment list` / `railway logs` 確認 SUCCESS → prod 新增一筆收藏確認 `add_collection` 寫入。
- [ ] **Step 4: push 前端**（Vercel）→ 以爬蟲 UA 與真人各開一次線上網頁，查 prod 表確認。
- [ ] **Step 5: Looker**：新增 `ops.v_engagement_daily`／`v_engagement_rate_weekly`／`v_real_users` 資料來源（Tu 輸入 `looker_ro` 密碼）→「互動」分頁（各平台 engagement rate、疑似爬蟲近似來訪次數卡片、真實用戶 7／30 天）→ 既有四張卡片標題加註「含爬蟲灌水，2026-10 修正前」。
- [ ] **Step 6: 文件**：`docs/OPS_DASHBOARD.md`（分頁表、指標定義、限制）、`docs/app-store-privacy-answers.md`（Usage Data → Product Interaction）、`docs/BACKLOG.md`、`CLAUDE.md` 測試數量；commit `docs: 互動事件報表與隱私聲明`。
- [ ] **Step 7: Tu 在 App Store Connect 補 Product Interaction。**
- [ ] **Step 8: `openspec-archive-change add-engagement-events`。**
- [ ] **Step 9: iOS 發版**（與分享網址修復、依賴升級同批）：`npm run release:dry` → `npm run release` → `npm run ios:sync` → `npm run build:ios` → Xcode Archive → 送審。

---

## 追加任務（2026-10-29，Task 7 實測發現，Tu 核可放進本分支）

實測發現：真人首訪一次建立多個匿名帳號（dev 一次 16 個；prod 2,778 個匿名帳號中 2,750 個落在 392 次「同一秒多帳號」爆發），且 `storio_guest_id` 與實際 session 帳號不一致，導致登入後收藏搬錯帳號；`migrate_guest_data` 為 SECURITY DEFINER、EXECUTE 給 PUBLIC 且不檢查呼叫者。Tu 決定：真人首訪只能建 1 個帳號；訪客先收藏再登入要接得上；採「登入後搬移、修簿記」，不採 linkIdentity。完成兩個追加任務後，重跑 Task 7。

### Task 9: Migration 007（migrate_guest_data 權限檢查）

**Files:**
- Create: `server/migrations/007_secure_migrate_guest_data.sql`

- [ ] **Step 1:** 重建 `public.migrate_guest_data(old_user_id uuid, new_user_id uuid)`：保留原搬移邏輯（先刪重複 `(external_id, media_type)`、再改 `user_id`）；`security definer`、`set search_path = public, pg_temp`；`auth.uid()` 為 null 或 `new_user_id` 不是呼叫者 → `42501`；`old_user_id` 為 null 或等於 `new_user_id` → 直接 return；`old_user_id` 非匿名帳號 → `42501`；`revoke all ... from public, anon; grant execute ... to authenticated;`；檔尾附驗證 SQL。
- [ ] **Step 2:** Tu 在 dev 執行 → controller 以 supabase-dev MCP 驗證 → Tu 在 prod 執行 → controller 以 supabase MCP 驗證。
- [ ] **Step 3: Commit** — `fix(db): migration 007 補上 migrate_guest_data 的權限檢查`

### Task 10: useAuth 全 App 只建一個匿名帳號、登入後正確搬移

**Files:**
- Modify: `client/src/hooks/useAuth.ts`
- Test: `client/src/hooks/__tests__/useAuth.test.ts`

**Interfaces:**
- Consumes: `detectBot()`、`useUserStore`（含 `anonSignInFailed`）（Task 4）；`migrate_guest_data` 的新規則（Task 9：只能由新帳號替自己搬、來源須為匿名帳號，違反時 42501）。
- Produces: `useAuth()` 回傳值與簽名不變（`{ user, token, loading, signOut, updateProfile, signInAnonymously }`）；另匯出僅供測試的 `__resetAuthForTests(): void`，重設模組層狀態。

- [ ] **Step 1: 寫失敗測試**（沿用該檔現有的 supabase mock 寫法；每測前呼叫 `__resetAuthForTests()`）
  - `concurrent mounts create one anonymous account`：同時 `renderHook(() => useAuth())` 5 次、無 session → `signInAnonymously` 只被呼叫 1 次。
  - `auth listener registered once`：5 個 mount → `onAuthStateChange` 只註冊 1 次；全部 unmount 後再 mount 不重複註冊。
  - `guest id matches the signed-in anonymous user`：`signInAnonymously` 回 `user.id = 'anon-1'` → `localStorage.storio_guest_id === 'anon-1'`，且 store `user.id === 'anon-1'`。
  - `migrates once on sign-in`：`storio_guest_id = 'anon-1'`，listener 收到 `SIGNED_IN`（非匿名 `user.id = 'real-1'`）→ `rpc('migrate_guest_data', { old_user_id: 'anon-1', new_user_id: 'real-1' })` 只呼叫 1 次（同時再送一次 `USER_UPDATED` 也不重複）；成功後 `storio_guest_id` 被移除。
  - `migration failure keeps guest id`：rpc 回 `{ error: { code: '42501' } }` → `storio_guest_id` 保留、登入狀態照常（store user 為 `real-1`）。
  - `bot still creates no account`：既有測試照常通過；5 個 mount 也不呼叫 `signInAnonymously`。
- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**（模組層狀態，不改 store 介面）：
  - 匿名登入 single-flight：模組層 `let initPromise: Promise<void> | null`；第一個 mount 執行 `initAuth`，其他 mount 共用同一個 promise。`signInAnonymously` 本身也要 single-flight（`signOut` 會呼叫它）。
  - auth listener 全 App 只註冊一次：模組層旗標，第一次 mount 時註冊，之後不再註冊、也不在元件 unmount 時解除（App 生命週期內常駐）。
  - `storio_guest_id` 只在「目前 session 是匿名帳號」時寫入，值取自該 session 的 `user.id`（listener 收到的 session，或 `signInAnonymously` 成功回傳的 `data.user.id`，兩者此時一致）。
  - 搬移：listener 收到非匿名 `SIGNED_IN`／`USER_UPDATED` 時，以模組層 in-flight 旗標保證同一次登入只呼叫一次 rpc；成功才移除 `storio_guest_id`，失敗只記 log。
  - E2E escape hatch、bot 分支、`anonSignInFailed` 行為維持不變。
- [ ] **Step 4: 跑測試確認通過**，再跑 `npm test`、`npx next lint`、`npm run build`。
- [ ] **Step 5: Commit** — `fix(auth): 全 App 只建一個匿名帳號，登入後正確搬移訪客收藏`
