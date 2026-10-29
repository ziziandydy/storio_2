# Storio 營運 Dashboard 維運手冊

> 設計：`docs/superpowers/specs/2026-10-23-ops-dashboard-design.md`
> 計畫：`docs/superpowers/plans/2026-10-23-ops-dashboard.md`
> 互動事件（2026-10-29）：`docs/superpowers/specs/2026-10-29-engagement-events-design.md`

## 入口

- 報表（Looker Studio，名稱 Storio Ops，不公開）：<https://datastudio.google.com/reporting/ac4485d1-2b4a-494c-aefd-a4ebaba31888>
- 即時健康（UptimeRobot 登入後台，非公開狀態頁）：<https://dashboard.uptimerobot.com/status/1277301/monitors>
- 通知管道：email（UptimeRobot 與 GitHub Actions 失敗信都寄到 Tu 的信箱，手機用 Gmail 通知）

## 報表分頁

| 分頁 | 看什麼 | 資料來源（`ops` schema） |
|---|---|---|
| 成長 | 總用戶、正式註冊、總收藏、啟用率與心得／評分／分季使用率、正式與匿名每日新增、每日新增收藏（依類型） | `v_signups_daily`、`v_activation`、`v_collections_daily`、`v_activity_summary` |
| AI 與成本 | 每日呼叫量、失敗率、token、延遲 | `v_ai_usage_daily` |
| 啟用與留存 | 啟用率趨勢（只含註冊滿 7 天）、留存透視表 | `v_activation`、`v_retention_proxy` |
| 活躍 | 近 7／30 天上線人數、有新增收藏人數、正式新註冊；近 30 天每日趨勢 | `v_activity_summary`、`v_active_daily`、`v_signups_daily` |
| 互動 | 各平台每週 engagement rate（瀏覽／點擊詳細／搜尋／新增收藏／分享 ÷ 打開）、每日互動人數、真實用戶（近 7／30 天）、疑似爬蟲來訪次數 | `v_engagement_rate_weekly`、`v_engagement_daily`、`v_real_users` |
| 健康 | UptimeRobot、Railway、Supabase 後台連結（不嵌入外部頁面） | 無 |

## 組成

| 元件 | 位置 | 做什麼 |
|---|---|---|
| keepalive | `.github/workflows/supabase-keepalive.yml`、`scripts/supabase-keepalive.sh` | 每日 03:17 UTC 對 prod 與 dev 各做一次唯讀查詢，失敗時 GitHub 寄信 |
| `ops` views | `server/migrations/004_ops_dashboard.sql`、`005_ops_activity.sql`（只存在 prod）、`006_engagement_events.sql`（prod 與 dev） | 彙總註冊、啟用、留存代理、收藏、AI 用量、活躍人數、互動事件 |
| 互動事件 | `public.engagement_events`；後端 `POST /api/v1/events`（`server/app/api/v1/endpoints/events.py`），前端 `client/src/lib/analytics.ts`、`client/src/hooks/useEngagementTracking.ts` | 6 種事件（open／browse／detail_view／search／add_collection／share）依平台、同一主體同一天只存一列；`add_collection` 由後端在新增收藏成功後記 |
| `looker_ro` | prod 資料庫角色 | 只能讀 `ops` views；連線上限 15 |
| 監控 | UptimeRobot 免費版（限非商業用途） | 6 個 HTTP／Keyword 監控，含 TMDB 與 Google Books 靜默失敗偵測 |
| 報表 | Looker Studio | 每個 view 一個自訂查詢資料來源（`select * from ops.v_xxx`；「互動」分頁的查詢見下方〈互動分頁的自訂查詢〉），資料新鮮度 12 小時 |

## 指標定義（看數字前先讀）

- **註冊含匿名**：`auth.users` 全部帳號。匿名帳號是 App 首次開啟時自動建立，約等於「新安裝」，不是真人註冊；卡片標「正式」才排除匿名。⚠️ **2026-10-29 修正前的數字嚴重灌水**：每次造訪會同一秒建出多個匿名帳號（prod 2,778 個匿名帳號中 2,750 個屬此情況），爬蟲與分享圖服務也會建帳號。「總用戶數」「新註冊（含匿名）」「啟用率」「上線人數」卡片標題已加註，修正上線後的新資料才可信。
- **上線人數是近似值**：以 `auth.sessions` 最後更新時間計。近 7／30 天卡片相對可信；每日趨勢的歷史部分因為每個 session 只留最後一次更新，會被低估。2026-10-29 起改看「互動」分頁的 `open` 人數（網頁與後端已上線；iOS 要等 v1.20.0 上架、Android 要等上架後才有資料）。
- **互動事件**：同一帳號、同一事件、同一平台、同一天（UTC）只算一次。`open`＝App 冷啟動或回到前景、網頁載入；`browse`＝首頁或館藏頁第一次滾動／觸控；`detail_view`＝作品詳情載入成功；`search`＝實際送出搜尋（不是每個按鍵）；`add_collection`＝新增收藏成功（後端記，舊版 App 也算）；`share`＝分享或下載完成（取消不算）。平台由後端依 `Origin` 判斷（`capacitor://localhost`→ios、`https://localhost`→android、其他→web）。
- **engagement rate**：每週各平台，做過該行為的帳號數 ÷ 同週同平台有 `open` 的帳號數；分子只算同週也有 `open` 的帳號，所以不超過 1。舊版 App 只有後端記的 `add_collection`、沒有 `open`，不進比率。
- **真實用戶（寬鬆版）**：近 7／30 天有任何事件（含只有 `open`）或新增過收藏的**帳號**數。訪客代號與爬蟲旗標由前端自報、可偽造，所以 engagement rate 與真實用戶都只算帳號。
- **疑似爬蟲來訪**：網頁上被判定為爬蟲（User-Agent 樣式或 `navigator.webdriver`）的訪客，不建帳號，以隨機訪客代號記一筆 `open`。爬蟲多半不保留儲存，數字接近「來訪次數」而非人數；不執行 JavaScript 的爬蟲完全不會被計數。
- **有新增收藏**：`public.collections.created_at`，滾動窗（現在往前 7／30 天），不是日曆週／月。
- **留存以「建立收藏」近似**，看不到單純開啟 App。
- **啟用率**：註冊後 7 天內至少新增 1 筆收藏的比例；註冊不滿 7 天的群組以 `cohort_mature` 排除。
- **AI 延遲**：view 依 endpoint／provider／model 分開存百分位數，報表日彙總 p50 取各組平均、p95 取各組最大，是近似值。
- 日期一律 UTC，台灣晚間資料會落在前一天。

## 常見維護

### 輪替 `looker_ro` 密碼
1. 終端機：`openssl rand -base64 24 | tr -d '/+=' | cut -c1-24`
2. Supabase prod SQL Editor：`alter role looker_ro login password '<新密碼>';`
3. Looker Studio 各資料來源重新授權（更新密碼；PostgreSQL 資料來源沒有複製功能，每個要各自輸入）。
4. 密碼只存在密碼管理器，不放 repo。

### 新增一個指標
1. 在新的 migration（例如 `006_*.sql`）用 `create or replace view ops.v_xxx` 建 view，保持預先彙總（Looker 單次查詢上限 15 萬列）。
2. 對 `looker_ro` 授權：`grant select on ops.v_xxx to looker_ro;`（`004` 的 `grant ... on all tables` 只涵蓋當時已存在的 view，新 view 必須自己授權。）
3. 在 prod SQL Editor 執行 migration。
4. 在 Looker Studio 新增自訂查詢資料來源 `select * from ops.v_xxx`（連線資訊：prod session pooler、使用者 `looker_ro.<專案代碼>`、SSL 並上傳 Supabase 根憑證改名的 `.pem`、不勾 client authentication）。
5. 日期一律 UTC。

### Looker 出現 `too many connections for role "looker_ro"`
資料來源與圖表各自佔連線，上限已調為 15。若新增很多資料來源後又出現，到 Supabase SQL Editor 執行 `alter role looker_ro connection limit <更大的數字>;`。這個錯誤不會出現在 `pg_stat_activity`，要看 Supabase Pooler 日誌。

### Supabase 專案被暫停了
1. 看 GitHub 是否有 `Supabase Keepalive` 失敗信，確認是 prod 還是 dev。
2. 到 Supabase Dashboard 按 Restore project。
3. 還原後手動觸發：`gh workflow run supabase-keepalive.yml`。
4. keepalive 目前只讀；若仍被暫停，或收到 Supabase「即將暫停」警告信，補寫入：建立一張只有一列時間戳的 `public.keepalive` 表加 RLS（只允許 anon SELECT／UPDATE），並讓 script 每日更新那一列。
5. 若反覆被暫停，評估升級 Supabase Pro。

### 部署後用 Railway CLI 驗證
後端與 Puppeteer 分享圖服務都在 Railway 專案 `comfortable-spontaneity`（production）：後端服務名 `storio_2`、分享圖服務名 `worthy-beauty`。另一個專案 `outstanding-rebirth` 與 Storio 無關，不要連到它。push 到 main 會自動重新部署。外部請求只能推測有沒有換新版，部署狀態與日誌要用 CLI 看。

一次性設定（Tu 自己做，登入會開瀏覽器授權）：
```bash
brew install railway
railway login
cd ~/Sites/storio_2 && railway link -w "Anderson Tu's Projects" -p comfortable-spontaneity -e production
```

每次 push 到 main 後（動到 `server/` 或 `puppeteer-service/` 時必做）：
1. `railway deployment list --service storio_2`（分享圖服務換成 `worthy-beauty`）：最新一筆要是 SUCCESS，不是 FAILED／CRASHED。
2. `railway logs --service storio_2`：確認啟動沒有 traceback、依賴安裝沒失敗。
3. 外部煙霧測試：
   - 後端：`curl https://storio2-production.up.railway.app/` 回 `{"status":"online",...}`；`/api/v1/collection/` 不帶 token 應回 401。
   - 分享圖：`curl https://worthy-beauty-production.up.railway.app/health` 回 `ok`，uptime 歸零代表已換新版。
4. 升級認證、HTTP 層或 AI 套件時，另在 App 實測登入、搜尋、分享圖各一次。
5. 出問題：Railway 後台對上一個成功的部署按 Redeploy／Rollback，再修。

注意：CLI 登入後有部署、改環境變數、刪服務的權限；Claude 只用唯讀指令（status、deployment list、logs），改設定或部署要先問 Tu。不要使用 `curl … | sh` 的 agents 安裝腳本（會連帶改 AI 工具的 MCP 設定），以 Homebrew 安裝即可。

### UptimeRobot 告警處理
- Backend alive 失敗：Railway 後端掛了，先看 Railway Metrics 與部署日誌。
- TMDB／Google Books 失敗：後端活著但外部 API 靜默壞掉（API 金鑰、額度）。這兩項 30 分鐘檢查一次，避免多餘的外部呼叫。
- 監控不得產生額外費用：不新增服務、不升級付費方案；Railway 只被輕量 GET 打。一個月後到 Railway Usage 頁確認用量沒有明顯增加。

## 互動分頁的自訂查詢

每段建成一個資料來源（連線用 `looker_ro`）：

```sql
-- 每週互動率
select week, platform, event, subjects, open_subjects, rate
from ops.v_engagement_rate_weekly
where week >= current_date - interval '12 weeks'

-- 每日互動人數（不含疑似爬蟲）
select day, platform, event, subjects
from ops.v_engagement_daily
where not is_suspected_bot and day >= current_date - 90

-- 真實用戶
select real_users_7d, real_users_30d from ops.v_real_users

-- 疑似爬蟲來訪（近似次數）
select day, sum(subjects) as bot_visits
from ops.v_engagement_daily
where is_suspected_bot and event = 'open' and day >= current_date - 90
group by day
```

## 已知限制

- 上線人數為近似值（見上）；互動事件從 2026-10-29 開始累積，歷史無法回補。
- 偽裝成真人的爬蟲抓不到（但它們不會建帳號，不影響只算帳號的指標）。
- 訪客轉正式帳號的那一天，同一個人可能在兩個帳號下各算一次。
- 未登入的 `open` 寫入可被偽造灌列（只影響疑似爬蟲次數與表格大小），見 BACKLOG。
- 留存以「建立收藏」近似，看不到單純開啟 App。
- AI 用量沒有 user_id，看不到每人用量。
- 資料庫健康只有每日 keepalive，沒有 5 分鐘即時偵測（`/search/trending/*` 有程序內記憶體快取，不能當 DB 檢查）。
- AI 金鑰失效最慢隔天從失敗率發現，不是即時警報。
- 報表資料新鮮度 12 小時，不是即時。
- 報表內嵌的資料來源綁在報表上，刪除或複製報表前要想清楚。
- Looker Studio 沒有可建立圖表的官方 API，圖表只能在介面中手動維護。
