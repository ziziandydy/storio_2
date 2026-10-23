# Storio 營運 Dashboard 設計

> 日期：2026-10-23 ｜ 狀態：待審閱 ｜ 路徑：Architectural

## 1. 目標與非目標

**目標**：一個單一入口、分頁式的營運 dashboard，讓 Tu 在電腦與手機（外出時）都能查看 Storio 的成長、AI 用量、上架與行銷成效、系統健康。

**非目標（YAGNI）**：
- 不做 per-user 的行為追蹤、漏斗、session 分析（需要埋點 SDK，延後）
- 不做當機與錯誤追蹤（Sentry，延後）
- 不做營收與變現指標（Storio 目前免費）
- 不自建任何常駐服務或管理頁
- 不做 Android／Google Play 指標（尚未上架）

## 2. 需求與限制（來自 Tu）

1. 盡量減少自建，以好維護為目標
2. 手機可看，且不依賴 Tu 的電腦開機
3. 盡可能整合在統一介面，用分頁切換
4. 除健康指標外，其他資料**不需要即時**
5. Supabase 免費專案要防止 7 天無活動被暫停（prod 與 dev 都要）

## 3. 現況（已確認）

| 層 | 技術 | 可用資料 |
|---|---|---|
| 前端 | Next.js 14 靜態匯出（Vercel）、Capacitor iOS／Android | 無產品分析、無錯誤監控 |
| 後端 | FastAPI（Railway） | 無營運統計端點；Railway 後台有 Metrics 分頁（具體圖表以後台為準） |
| 資料庫與驗證 | Supabase（含匿名登入） | `auth.users`（含 `is_anonymous`、`created_at`）、`collections`、`ai_api_usage`（無 user_id）、`trending_cache`、`daily_recommendations` |
| 分享圖 | Puppeteer 微服務（Render 免費層） | 無 |
| 外部後台 | App Store Connect、Search Console | 各自獨立 |

已知盲點：2026-10-22 TMDB 金鑰填錯時，搜尋端點仍回 HTTP 200（後端靜默略過 TMDB），Railway 與一般在線監控都不會發現。

## 4. 架構

```
GitHub Actions（每日 ping）──► Supabase prod / dev（防暫停）

UptimeRobot ──► 後端 / Web / Landing / Puppeteer（健康，即時，手機推播）

Supabase prod ──► schema `ops` 的 views ──► 唯讀角色 looker_ro ──┐
Search Console ───────────────────────────────────────────────────┼─► Looker Studio 報表（分頁）
Google Sheet（n8n 每日從 App Store Connect 寫入，第 3 階段）──────┘
```

Looker Studio 報表分頁：**成長｜AI 與成本｜行銷｜商店｜健康**。

## 5. 元件設計

### 5.1 Supabase 防暫停 keepalive（第 0 階段）

**依據**：官方文件〈Project Pausing〉：免費專案在「7 天內使用者資料庫活動不足」時暫停，「通常每天幾次對資料庫的請求就夠」，可用 API 呼叫產生活動；文件**沒有**說明唯讀請求是否算數。討論串中自稱 Supabase 員工的回覆說至少要一次寫入（未經官方文件證實）。因此設計成同時涵蓋讀與寫，且無法被保證，只能事後觀察。

- **工作流程**：`.github/workflows/supabase-keepalive.yml`，每日一次（`17 3 * * *` UTC，避開整點），並支援 `workflow_dispatch`。免費：公開 repo 標準 runner 不限分鐘數。
- **每次對 prod 與 dev 各做**：
  1. 讀：`GET /rest/v1/collections?select=id&limit=1`
  2. 寫：`PATCH /rest/v1/keepalive?id=eq.1`，body `{"pinged_at": "<now>"}`
  - 兩者用 `curl --fail`，任一失敗則 workflow 失敗，GitHub 會寄信給 Tu（這也是專案被暫停時的警報）。
- **新增資料表**（migration `server/migrations/004_keepalive.sql`，prod 與 dev 都要套用）：`public.keepalive(id int primary key, pinged_at timestamptz)`，預先插入 `id=1` 一列；啟用 RLS，只允許 anon **SELECT 與 UPDATE** 該列（`PATCH ... ?id=eq.1` 需要能讀到該列才能更新），不允許 INSERT／DELETE。表內只有一列時間戳，被濫用也無害。
- **Secrets**（GitHub repo secrets）：prod 與 dev 各一組 `SUPABASE_URL` 與 anon key（只用 anon，絕不放 service role）。
- **驗證**：兩個專案手動觸發都成功、`pinged_at` 有更新；故意用錯誤 key 時 workflow 會失敗並寄信。長期有效性靠觀察：之後不再收到 Supabase 的「即將暫停」警告信。
- **後備**：若觀察到仍被暫停，改用 Supabase Pro（不暫停），或追加更頻繁的寫入。

### 5.2 健康監控（第 1 階段）

- **工具**：UptimeRobot 免費版（我查到：50 個監控、5 分鐘間隔、含關鍵字監控；**自 2024-10 起限非商業用途**，Storio 目前免費故可用，若日後變現需改用付費或 BetterStack）。手機 App 與推播能力**未查證**，實作時先確認，不行就用 email／Telegram 通知。
- **監控項目**：

| 項目 | 檢查 | 目的 |
|---|---|---|
| 後端存活 | `GET /` 含關鍵字 `online` | 服務是否在跑 |
| TMDB 是否正常 | `GET /api/v1/search/?q=inception` 含 `"source":"tmdb"` | 抓靜默失敗 |
| Google Books 是否正常 | 書籍關鍵字搜尋含 `"source":"google_books"` | 同上 |
| Web App | `https://storio.andismtu.com/` HTTP 200 | 前端是否在線 |
| 落地頁 | `https://ziziandydy.github.io/storio_2/` HTTP 200 | 行銷入口 |
| Puppeteer | `/health` | 分享圖服務；Render 免費層會休眠，5 分鐘一次的檢查會讓它保持喚醒（副作用，需留意免費時數） |

- 搜尋端點有 30 次／分鐘的限流，5 分鐘一次不會觸發。
- 後端的 CPU／記憶體／流量用 Railway 後台 Metrics 分頁看，不另外整合。

### 5.3 資料層：`ops` schema（第 1 階段）

在 prod Supabase 建立 `ops` schema（**不加入 API 對外公開的 schema 清單**，避免被 anon 讀取），放唯讀 views：

| View | 內容 |
|---|---|
| `ops.v_signups_daily` | 每日新註冊，匿名與已登入分開（`auth.users.is_anonymous`） |
| `ops.v_activation` | 依註冊日分群，7 天內至少新增 1 筆收藏的比例 |
| `ops.v_retention_proxy` | 依註冊週分群，之後各週有新增收藏的比例（以建立收藏當活躍代理，**看不到單純開啟 App**） |
| `ops.v_collections_daily` | 每日新增收藏數、依 `media_type`、心得填寫率、評分率、分季收藏使用率 |
| `ops.v_ai_usage_daily` | 依 endpoint／provider／model：呼叫數、失敗數、token、延遲 p50／p95（`ai_api_usage`；token 為主，不內建費用換算，因單價會變） |

- **唯讀角色** `looker_ro`：只對 `ops` views 有 SELECT，對 `auth`、`public` 基礎表無權限。因 views 以擁有者權限執行，角色不需碰底層表。
- Looker 連接器對非 `public` schema 不支援直接選表，所以報表用**自訂 SQL**（`select * from ops.v_xxx`）。
- 單次查詢上限 15 萬列：views 都預先彙總，不輸出明細。
- 只有 prod 建 `ops`；dev 不需要。

### 5.4 Looker Studio 報表（第 1～3 階段）

- 連線：PostgreSQL 連接器接 Supabase **session pooler**（IPv4）。Google 官方要求開放其 IP 範圍（目前列出 `142.251.74.0/23`，使用前再確認最新清單）；Supabase 預設無 IP 限制，若有設 Network Restrictions 則需加入。SSL 可能需要上傳 Supabase 的 CA 憑證。
- 分頁：
  - **成長**（第 1 階段）：註冊、啟用率、留存代理、收藏分佈
  - **AI 與成本**（第 1 階段）：呼叫量、失敗率、token、延遲
  - **行銷**（第 2 階段）：Search Console 連接器（原生），涵蓋落地頁與 App 網域
  - **商店**（第 3 階段）：App Store Connect 資料，經 n8n 每日寫入 Google Sheet 再接入
  - **健康**（第 1 階段）：UptimeRobot 狀態頁與 Railway、Render 後台的連結。**不依賴 iframe 嵌入**（Looker Studio 嵌入外部網頁的限制查證不到可靠說法）
- 更新頻率：非健康指標以每日為單位即可，**不依賴特定的快取間隔**；實作時實測資料新鮮度。
- 手機：用瀏覽器開報表連結；版面用手機友善的頁面尺寸。
- 分享：僅限 Tu 的 Google 帳號，**不公開**（含用戶數與營運資料）。

## 6. 階段

| 階段 | 內容 | 前置 |
|---|---|---|
| 0 | keepalive workflow + `keepalive` 表（prod、dev） | 無 |
| 1 | UptimeRobot 監控、`ops` views + `looker_ro`、Looker 的「成長」「AI 與成本」「健康」分頁 | Looker 連 Supabase 成功 |
| 2 | Search Console「行銷」分頁 | 第 1 階段 |
| 3 | App Store Connect → n8n → Google Sheet →「商店」分頁 | 需要 App Store Connect API 金鑰，需妥善保管 |
| 延後 | PostHog（行為）、Sentry（錯誤）、Google Play、營收 | 有需要再評估；加前端 SDK 要更新隱私標籤 |

## 7. 風險與未驗證項目

- **Looker Studio 連 Supabase**：SSL／CA 與 IP 限制需實測；失敗的後備是用 n8n 每日把 view 結果寫進 Google Sheet 再讓 Looker 讀。
- **keepalive 是否真的足夠**：官方未保證，只能長期觀察（見 5.1）。
- **UptimeRobot**：手機 App 能力未查證；免費版限非商業用途。
- **資料新鮮度**：Looker 對 Postgres 的更新間隔未查證。
- **安全**：`looker_ro` 的密碼存在 Google 端，使用限權帳號、定期輪替；不得使用 service role。經歷 2026-10-21 Railway 事件後，所有新增金鑰一律最小權限，並記錄在 vault。
- **指標限制**：留存是「建立收藏」的代理，不含單純開啟；AI 用量沒有 user_id，看不到每人用量。

## 8. 驗收標準

1. keepalive：兩個專案手動觸發皆成功、`pinged_at` 更新；用錯誤 key 時 workflow 失敗並寄信。
2. 權限：以 `looker_ro` 登入，能查 `ops` views，**不能**查 `auth.users` 與 `public.collections`。
3. 指標正確：各 view 的數字與手寫 SQL 的結果相符。
4. 警報：暫時把 TMDB 關鍵字改錯，監控會在 5～10 分鐘內發出通知，再改回來。
5. 手機：用行動網路（非家中 Wi-Fi）打開報表，各分頁都能載入。
6. 維護成本：除 keepalive workflow 與 SQL views 外，沒有需要自己維護的程式碼或常駐服務。
