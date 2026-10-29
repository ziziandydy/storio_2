# 互動事件記錄與匿名帳號灌水修正 設計文件

- 日期：2026-10-29
- 狀態：設計待 Tu 核可（builder check 已完成，問題已併入）
- 預計上線：與下次 iOS 發版同批（前端改動需新版 App 才在 iOS 生效；後端與網頁版 push 即生效）

## 1. 為什麼要做

Tu 想知道「有多少是真實用戶打開了 App 並真的使用產品，有多少只是爬蟲觸發」。現況的營運報表（見 `docs/OPS_DASHBOARD.md`）有兩個問題：

1. **上線人數只是近似值**：以 `auth.sessions` 最後更新時間估算，沒有任何互動事件，無法回答「打開之後做了什麼」。
2. **帳號數被大量灌水**（偵察結果，2026-10-29）：根 layout 掛的 `AppOpenReset` 一開頭就呼叫 `useAuth()`，而 `useAuth()` 在沒有登入狀態時會立刻 `signInAnonymously()`。結果**任何頁面的任何訪客**都會建立一個 Supabase 匿名帳號，包括：
   - 會執行 JavaScript 的爬蟲（Googlebot、AI 爬蟲、Rich Results Test 等），每次無 cookie 來訪就多一個帳號；
   - 我們自己的分享圖服務（Puppeteer 開 `/share/render`），每次瀏覽器重啟（部署、當機）都會再建立。
   這很可能就是「約 2,588 帳號、約 19 個正式註冊、近 30 天 1 人收藏」的主因；目前「總用戶數」「新註冊（含匿名）」「啟用率」的分母都被放大。

成功的樣子：報表能看到「本週各平台真實打開人數，以及其中做了瀏覽／點擊詳細／搜尋／收藏／分享的比例」，疑似爬蟲另外計數，不混進真人。

## 2. 目標、非目標、反目標

**目標**
- 記錄 6 種互動事件，依平台（iOS／Android／web）分開，**每種行為各自計數**，用來算 engagement rate。
- 網頁版的疑似爬蟲另外標記並可計數。
- 修根因：分享圖服務與已知爬蟲不再建立匿名帳號。
- 報表新增「互動」分頁。

**非目標**
- 不刪除既有帳號（無法可靠分辨，且刪除不可逆）。
- 不做漏斗互斥歸類（Tu 決定各自計數）。
- 不做事件層級的細節分析（停留時間、點了哪部作品、搜尋了什麼字）。
- 不做 Next 15／16 升級或其他無關重構。

**反目標**（技術上可行但算失敗）
- 真人的使用體驗有任何變化（多一個轉圈、多一次延遲、登入流程改變）。
- 事件上報失敗導致任何功能失敗或報錯給使用者。
- 記錄了可識別個人的內容（搜尋字串、心得、作品名、IP 原文）。
- 舊版 App（v1.19.0 以前）因後端改動而壞掉。

## 3. 已決定的事（Tu 的決定）

1. **範圍**：iOS、Android、網頁都算，但分平台分開算。
2. **行為層次**：打開 → 瀏覽 → 點擊詳細 → 搜尋 → Aha（新增收藏、分享），**各自計數**，用來算 engagement rate（做過該行為的不重複人數 ÷ 同期打開的不重複人數）。
3. **一併修根因**，採 **A 方案「排除已知非真人」**：`/share/render` 頁面、User-Agent 屬已知爬蟲、或 `navigator.webdriver === true` 的網頁訪客，不建立匿名帳號。真人流程、iOS／Android App 完全不變。
4. **要看到疑似爬蟲的數量**：沒有帳號的訪客用瀏覽器內的隨機訪客代號記「打開」，並標記為疑似爬蟲。

## 4. 設計

### 4.1 事件定義

| 事件代碼 | 什麼時候算一次 | 在哪裡記 |
|---|---|---|
| `open` | App 冷啟動或回到前景；網頁頁面載入 | 前端 |
| `browse` | 在首頁或館藏頁有**真實使用者互動**（滾動、觸控、滑鼠滾輪），頁面載入本身不算 | 前端 |
| `detail_view` | 進入作品詳情頁（`/details`，含館藏內的詳情） | 前端 |
| `search` | 送出一次搜尋（一般或 AI 搜尋都算），以實際發出請求為準，不是每次按鍵 | 前端 |
| `add_collection` | 新增收藏成功 | **後端**，在 `POST /api/v1/collection/` 成功後記錄，三個前端入口自動涵蓋，不需前端改動，也能涵蓋舊版 App |
| `share` | 單張或月回顧分享成功（系統分享面板完成或網頁下載完成） | 前端 |

**去重**：同一個主體（帳號或訪客代號）、同一天（UTC）、同一種事件、同一平台只存一列。用資料表唯一鍵加 `on conflict do nothing` 達成，前端可以放心重複送。

### 4.2 誰是「主體」

- 有帳號（含匿名帳號）：用 Supabase `user_id`，從 Bearer token 由後端解出，**不信任前端自報**。
- 沒有帳號的網頁訪客（被 A 方案擋下的疑似爬蟲）：前端在 `localStorage` 產生並保存一個隨機 UUID 作為 `visitor_id`，只用於計數，不含任何個人資料。這類只會送 `open`。
- 爬蟲常不保留儲存，所以疑似爬蟲的數字較接近「來訪次數」，報表要這樣標示。
- **`open` 要等 auth 有結果才送**（我的判斷）：首次造訪或首次啟動時，`open` 若在匿名登入完成前送出會沒有 token。所以 `track('open')` 要等到「有 token」或「判定為 bot」其中之一才送：有 token 記在 `user_id`，bot 記在 `visitor_id`。真人若匿名登入失敗，記在 `visitor_id` 且 `is_suspected_bot = false`，不丟棄。本機同日去重的 key 要包含主體（user 或 visitor），避免先記到 visitor 後就略過 user。

### 4.3 疑似爬蟲判斷（只用於網頁）

在前端集中一個判斷函式（例如 `lib/botDetection.ts`），回傳 `{ isBot: boolean, reason: string | null }`：
1. 路徑是 `/share/render` → `reason: 'render_service'`（我們自己的分享圖服務）。
2. `navigator.webdriver === true` → `reason: 'webdriver'`。
3. User-Agent 符合已知爬蟲樣式（不分大小寫）：`bot|crawler|spider|crawling|headlesschrome|lighthouse|google-inspectiontool|googleother|facebookexternalhit|slurp|bingpreview|gptbot|chatgpt-user|oai-searchbot|claudebot|claude-user|claude-searchbot|perplexitybot|applebot|bytespider|ccbot|amazonbot|semrush|ahrefs|petalbot|yandex|duckduckbot|baiduspider` → `reason: 'user_agent'`。
4. 原生 App（Capacitor 判斷為 native）一律 `isBot: false`。

`/share/render` 另外**完全不記任何事件**（它是我們自己的服務，不需要計數）。

第 3 層「沒有真人互動」不需要另外判斷：報表上「有 open 但沒有任何其他事件」本身就看得出來。

### 4.4 根因修正（A 方案）

- `useAuth` 的 `initAuth`：在呼叫 `signInAnonymously()` 前先問 `botDetection`，若 `isBot` 則**不建立帳號**，維持 `user = null`、`loading = false`。
- 需確認所有依賴 token 的元件在「沒有帳號且不在載入中」時不會無限轉圈或報錯：爬蟲看到的頁面可以是「訪客空狀態」，但**不得**拋錯或卡住（爬蟲看到的內容會影響 SEO，首頁 JSON-LD、標題、說明文字必須照常輸出）。
- 真人、原生 App 的程式路徑不變。

### 4.5 資料表與後端

**新 migration `server/migrations/006_engagement_events.sql`**（Tu 在 prod SQL Editor 執行，可重複執行）：

`public.engagement_events`
| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid PK | |
| `day` | date not null | UTC 日期，由後端寫入 |
| `event` | text not null | 限定 4.1 的 6 種（check constraint） |
| `platform` | text not null | `ios`／`android`／`web`（check constraint） |
| `user_id` | uuid null | 有帳號時填，指向 `auth.users`，帳號刪除時一併刪除（`on delete cascade`） |
| `visitor_id` | uuid null | 無帳號訪客時填 |
| `is_suspected_bot` | boolean not null default false | |
| `bot_reason` | text null | `user_agent`／`webdriver`（`render_service` 不會寫入，因為該頁不記事件） |
| `created_at` | timestamptz default now() | |

- `user_id` 與 `visitor_id` 必須恰好有一個（check constraint）。
- 去重唯一索引：`(coalesce(user_id, visitor_id), event, platform, day)`。
- RLS 開啟、不開放 public 存取，只有後端 service role 寫入（比照 `ai_api_usage` 的模式）。
- **刪除語意**（我的判斷）：刪除帳號（`DELETE /me`）由 `user_id` 的 `on delete cascade` 一併刪除事件，不需在程式裡另外刪。「清除資料」（`DELETE /me/data`，只清收藏）**不刪事件**，事件是使用統計而非使用者內容。不要在 `clear_user_data()` 裡加刪事件的邏輯（兩個端點共用它）。
- **訪客轉正式帳號**（我的判斷）：`migrate_guest_data`（只存在線上 Supabase、不在 repo）只搬 `collections`，**不改它**。訪客登入成 Apple／Google 帳號的那一天，同一個人可能在兩個 `user_id` 下各被算一次；正式註冊總數約 19 人，影響可忽略，列為已知取捨。

**新 API `POST /api/v1/events`**（三層架構：endpoint → service → repository）
- Body：`{ "event": "...", "platform": "ios|android|web", "visitor_id"?: uuid, "is_suspected_bot"?: bool, "bot_reason"?: str }`。
- 有 Bearer token → 解出 `user_id`，忽略 `visitor_id`。沒有 token → 必須有 `visitor_id`，且**只接受 `open`**（避免無帳號者灌其他事件）。
- **`platform` 由後端依 `Origin` 標頭判斷，不信任前端值**（我的判斷）：`capacitor://localhost` → `ios`、`https://localhost` → `android`、其他 → `web`（對照 `main.py` 的 CORS 設定）。這樣 `add_collection` 也能由後端正確歸類平台，舊版 App 不需改動就有正確資料。前端可以照送 `platform` 欄位，但只作為除錯參考，不寫入。
- 限流：比照既有 slowapi，每 IP 每分鐘 60 次。
- 永遠回 `204`（含重複事件）；驗證失敗回 422。寫入要 `await`（Railway 上 fire-and-forget 會靜默失敗，見記憶 feedback_railway_fire_and_forget_unsafe）。
- `add_collection` 不經這支 API，由 collection service 在新增成功後直接呼叫同一個 event service；記錄失敗只記 log，**不得**讓新增收藏失敗。event repository 一律用 service-role client 寫入（`CollectionService` 用的是使用者 token，不能直接寫這張表）。

### 4.6 前端上報

- 一個集中的 `lib/analytics.ts`（名稱由 builder 決定）：`track(event)`，負責帶 platform、token 或 visitor_id、bot 標記，並在**同一天同一事件已送過時本機略過**（用 localStorage 記錄，減少請求）；網路失敗靜默忽略，不重試、不阻塞 UI。
- `open`：原生 App 在啟動與回到前景時送（掛在 `AppOpenReset` 旁或 Capacitor `App` 的 `appStateChange`）；網頁在根 layout 載入時送一次。
- `browse`：首頁與館藏頁監聽第一次 `scroll`／`touchstart`／`wheel`，觸發一次即移除監聽。
- `detail_view`：詳情頁載入成功時。
- `search`：搜尋頁實際發出搜尋請求時（一般與 AI 搜尋）。
- `share`：`ShareModal`、`MonthlyRecapModal` 分享成功的回呼中。

### 4.7 報表

- 新 migration 內一併建立 `ops.v_engagement_daily`（day、platform、event、is_suspected_bot、不重複主體數），授權給 `looker_ro`。
- 可另建 `ops.v_engagement_rate_weekly`：每週每平台各事件人數 ÷ 同期 `open` 人數（只算 `is_suspected_bot = false`）。
- Looker 新增「互動」分頁：依平台並排顯示各行為 engagement rate；網頁的疑似爬蟲來訪次數獨立一張卡片，標示「近似來訪次數」。Looker 只能在介面手動做，由 Claude 操作瀏覽器、Tu 輸入 `looker_ro` 密碼。
- 既有卡片與 004／005 的 views **不改 SQL**（我的判斷，避免藏掉上線前的歷史帳號）：「總用戶數（含匿名）」「新註冊（含匿名）」「啟用率」「上線人數」標題補註「含爬蟲灌水，2026-10 修正前」；修正上線後這些數字會自然變乾淨。
- 新增「真實用戶」卡片（Tu 決定採**寬鬆版**）：期間內有任何 `is_suspected_bot = false` 事件（含只有 `open`）或新增過收藏的不重複帳號／訪客，近 7 天與近 30 天各一張。已知限制：偽裝成真人的爬蟲會被算入，要看「真的有在用」請看各行為的 engagement rate。
- 更新 `docs/OPS_DASHBOARD.md` 的分頁表與指標定義。

### 4.8 隱私

- App Store Connect「App 隱私」新增 **Usage Data → Product Interaction**：用途 Analytics（與 App Functionality），與身分連結，不用於追蹤。由 Tu 在後台操作；`docs/app-store-privacy-answers.md` 同步更新。
- Google Play Data Safety 同步補「App activity → App interactions」（Android 上架時處理）。
- 隱私政策頁現有條款已涵蓋使用資料分析，不需改字；若 builder 認為需要，提出給 Tu 決定。
- 不記錄 IP 原文、User-Agent 原文、搜尋字串、作品 ID。

## 5. 限制與已知取捨

- 偽裝成真人的爬蟲抓不到，會被算成真人的 `open`；但它們幾乎不會產生 `browse` 以後的事件，所以 engagement rate 的分子仍可信，分母可能略偏高。
- 疑似爬蟲數字是來訪次數的近似值。
- 不執行 JavaScript 的爬蟲完全不會被計數。
- iOS 的 `open` 等前端事件要等新版 App 上線、用戶更新後才開始有資料；`add_collection` 由後端記錄，所有版本立即生效。
- 歷史資料無法回補；新報表從上線日開始。

## 6. 交給 builder 決定的事

- 檔案與函式命名、`track` 的介面細節。
- `browse` 監聽要掛在頁面元件還是共用 hook。
- 測試的切分方式（遵循專案 TDD：後端 pytest、前端 vitest；`useAuth` 的 bot 分支必須有測試）。
- Looker 圖表的具體樣式。

## 7. 驗收

- 後端：事件 API 去重、無 token 只收 `open`、限流、`add_collection` 記錄失敗不影響新增收藏，皆有 pytest。
- 前端：`botDetection` 各規則、`useAuth` 對 bot 不建帳號、`track` 同日去重與失敗靜默，皆有 vitest。
- 以 Puppeteer（`/share/render`）與帶爬蟲 User-Agent 的 headless 瀏覽器實測：不建立匿名帳號、首頁 JSON-LD 照常輸出。
- 真人路徑實測（網頁與 iOS 模擬器或真機）：匿名帳號照常建立、六種事件都寫進資料表、UI 無任何變化。
- 部署後在 prod 查 `engagement_events` 有資料，Looker 互動分頁顯示正常。
