# Storio 營運 Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Storio 的單一入口營運 dashboard（Looker Studio 分頁），並讓 prod 與 dev 的 Supabase 免費專案不被暫停、關鍵服務有即時警報。

**Architecture:** 每日 GitHub Actions 呼叫一個小 shell script，對 Supabase 做一次唯讀的資料庫查詢以防暫停（Tu 觀察到平常開 App 就算活動，故不做寫入）；UptimeRobot 以 HTTP／Keyword 監控抓服務與 TMDB／Google Books 靜默失敗；prod Supabase 新增不對外公開的 `ops` schema，放彙總 views 與唯讀角色 `looker_ro`，由 Looker Studio 以自訂 SQL 讀取並分頁呈現。

**Tech Stack:** Bash、Python 3 標準庫（僅測試用 mock）、PostgreSQL（Supabase）、GitHub Actions、UptimeRobot 免費版、Looker Studio。

**Spec:** `docs/superpowers/specs/2026-10-23-ops-dashboard-design.md`

**範圍**：本計畫只涵蓋 spec 的第 0 階段與第 1 階段。第 2 階段（Search Console 行銷分頁）與第 3 階段（App Store Connect 商店分頁）另寫計畫。

**執行順序**：先做 **Task 0**（連線可行性驗證）。它決定 Looker Studio 能不能直接連 Supabase，結果會影響 Task 5 與 Task 7。

## Global Constraints

- 全部使用繁體中文（註解、文件、commit 訊息）。
- keepalive **只用 anon key**，絕不放 service role；GitHub Secrets 分 prod 與 dev 兩組。
- `ops` schema **不得**加入 Supabase API 對外公開的 schema 清單；只在 **prod** 保留（dev 僅作 dry run，結束後刪除）。
- `looker_ro` 對 `auth`、`public` 基礎表**零權限**，只對 `ops` views 有 SELECT。
- `looker_ro` 密碼只用英數字（避免連接器編碼問題），**不寫進 repo**。
- Migration 風格比照 `server/migrations/003_ai_api_usage.sql`：檔頭註解背景與執行方式、可重複執行（冪等）、結尾附手動驗證查詢。
- 所有日期分組使用 UTC。
- 免費額度與限制：UptimeRobot 免費版（50 個監控、5 分鐘間隔、HTTP 與 Keyword 可用、**限非商業用途**）；Looker 單次查詢上限 15 萬列。
- Commit 訊息結尾加上：`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` 與 `Claude-Session: https://claude.ai/code/session_01UyHKMe35rtKmP8DN1w1kNN`。
- **監控不得產生額外費用**：Railway（後端與 Puppeteer 都在這，是付費、依用量計費）只被輕量 HTTP GET 打；不新增任何服務、不開常駐程序、不加付費監控方案。實作上把會呼叫外部 API 的 TMDB／Google Books 檢查降到 15 分鐘一次，其餘 5 分鐘。
- 不得讀取、印出或提交任何金鑰值；金鑰由 Tu 在各平台後台操作或以 `gh secret set` 互動輸入。

## Review Focus

1. **GET 回 200 但不是 JSON 陣列**：閘道或錯誤頁可能回 HTTP 200 的 HTML；專案被暫停時也可能回非預期內容。若只看狀態碼會「假成功」。預期：回應不是以 `[` 開頭的 JSON 陣列就視為失敗並讓 workflow 變紅。（Task 1 測試）
2. **缺少環境變數**：GitHub Secrets 沒設或打錯名稱時，script 應立刻以明確訊息失敗，不是靜默成功。（Task 1 測試）
3. **未成熟的 cohort**：註冊不滿 7 天的用戶不可能已滿足「7 天內啟用」，會把啟用率拉低。預期：view 提供 `cohort_mature` 欄位讓報表可過濾。（Task 4、5）
4. **資料很少或為空**：`ai_api_usage` 近期幾乎沒有資料，view 在 0 列時仍要正常回傳，圖表不能壞。（Task 5）
5. **UTC 與台灣日期差一天**：晚間（台灣）建立的收藏在 UTC 會落在前一天。預期：報表標明為 UTC，不在 view 裡混用時區。（Task 4 註解、Task 7 圖表標題）
6. **`looker_ro` 越權**：預期它讀 `public.collections`、`auth.users` 都被拒絕，也無法透過 Supabase REST API 讀到 `ops`。（Task 5）

## File Structure

| 檔案 | 責任 |
|---|---|
| `scripts/supabase-keepalive.sh`（新增） | 對單一 Supabase 專案做一次唯讀查詢，任何失敗則非 0 結束 |
| `scripts/tests/mock_supabase.py`（新增） | 測試用的假 Supabase REST 伺服器（標準庫） |
| `scripts/tests/test_supabase_keepalive.sh`（新增） | 對 script 的情境測試（成功、GET 401、GET 回非陣列、缺環境變數、伺服器不可達） |
| `.github/workflows/supabase-keepalive.yml`（新增） | 每日排程，依序 ping prod 與 dev |
| `server/migrations/004_ops_dashboard.sql`（新增） | `ops` schema、5 個 views、`looker_ro` 角色與權限 |
| `docs/OPS_DASHBOARD.md`（新增） | 維運手冊：監控清單、報表連結、輪替 `looker_ro` 密碼、新增指標的方法 |

---

### Task 0: 連線可行性驗證（spike，用完即丟）

**目的**：計畫中風險最高的一環是「Supabase pooler 是否接受自訂登入角色」與「Looker Studio 能否連上 Supabase（SSL、IP）」。先用一個探測角色在 **dev** 驗證，避免寫完 views、keepalive、監控之後才發現走不通。不建立 `ops` schema、不留任何資產。

**Files:**
- 無（只操作 dev 資料庫與 Looker Studio）

**Interfaces:**
- Consumes: dev 專案的 session pooler 連線資訊（Dashboard → Connect → Session pooler）
- Produces: 一個明確結論：**可行**（繼續 Task 1 起的原計畫），或**不可行**（改採 spec 第 7 節後備方案：n8n 每日把 view 結果寫進 Google Sheet，Looker 讀 Sheet；此時 Task 5 Step 7 與 Task 7 Step 1 需要改寫，先回報再繼續）

- [ ] **Step 1: 在 dev 建立探測角色**

由 Tu 先產生密碼（只含英數字，只用這一次）：

```bash
openssl rand -base64 24 | tr -d '/+=' | cut -c1-24
```
再到 **dev** 專案 SQL Editor 執行（把密碼貼進單引號內；這行不要存成檔案）：

```sql
create role looker_probe login password '<剛產生的密碼>';
```
Expected: 成功。

- [ ] **Step 2: 以探測角色透過 session pooler 連線**

由 Tu 到 dev 專案 Dashboard → Connect → Session pooler 取得主機（埠 5432）與專案代碼，執行（密碼用 `PGPASSWORD` 環境變數，不要寫進指令列）：

```bash
PGPASSWORD='<探測角色密碼>' psql "host=<dev session pooler 主機> port=5432 dbname=postgres user=looker_probe.<dev 專案代碼> sslmode=require" -c "select 1 as ok;"
```
Expected: 回傳 `ok = 1`。
若失敗：記下完整錯誤訊息（不含密碼），到 Step 4 清理後，回報並採後備方案。

- [ ] **Step 3: 以相同參數從 Looker Studio 連線**

由 Tu 在 Looker Studio 新增 PostgreSQL 連接器，主機、埠 `5432`、資料庫 `postgres`、使用者 `looker_probe.<dev 專案代碼>`、密碼同上，啟用 SSL（若要求憑證，下載 Supabase 的 CA 憑證上傳），選「自訂查詢」輸入 `select 1 as ok`。
Expected: 預覽顯示一列 `ok = 1`。
若出現連線逾時或被拒：確認 dev 專案沒有設定 Network Restrictions；有的話加入 Google 官方列出的 Looker Studio IP 範圍後重試；仍失敗就記下錯誤並採後備方案。

- [ ] **Step 4: 清理**

由 Tu 在 dev SQL Editor 執行，並在 Looker Studio 刪除剛建的資料來源與測試報表：

```sql
drop role if exists looker_probe;
```
Expected: 成功；Looker Studio 內沒有殘留的探測資料來源。

- [ ] **Step 5: 決策關卡**

把 Step 2 與 Step 3 的結果（成功或完整錯誤訊息）告訴我。
- 兩者皆成功：繼續 Task 1。Task 5 Step 7 仍要在 prod 重新驗證一次（prod 的 pooler 主機與專案代碼不同）。
- 任一失敗：**停止**，先與 Tu 決定改走後備方案，我再修改 Task 5、Task 7 後才繼續。

---

### Task 1: keepalive script 與測試

**Files:**
- Create: `scripts/supabase-keepalive.sh`
- Create: `scripts/tests/mock_supabase.py`
- Create: `scripts/tests/test_supabase_keepalive.sh`

**Interfaces:**
- Consumes: 環境變數 `SUPABASE_URL`（例如 `https://xxxx.supabase.co`）、`SUPABASE_ANON_KEY`
- Produces: `scripts/supabase-keepalive.sh` — 成功回傳 0；任何 HTTP 錯誤、逾時、缺環境變數、或回應不是 JSON 陣列則回傳非 0 並在 stderr 印出原因。Task 3 的 workflow 以 `bash scripts/supabase-keepalive.sh` 呼叫。

- [ ] **Step 1: 寫 mock 伺服器（測試用）**

建立 `scripts/tests/mock_supabase.py`：

```python
#!/usr/bin/env python3
"""測試用假 Supabase REST 伺服器。用法：mock_supabase.py <port> <mode> <log_file>
mode: ok | get401 | get_html"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

port, mode, log_file = int(sys.argv[1]), sys.argv[2], sys.argv[3]


class Handler(BaseHTTPRequestHandler):
    def _log(self):
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"{self.command} {self.path}\n")

    def _send(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self._log()
        if mode == "get401":
            self._send(401, {"message": "Invalid API key"})
        elif mode == "get_html":
            data = b"<html>gateway ok</html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        else:
            self._send(200, [])

    def log_message(self, *args):
        pass


HTTPServer(("127.0.0.1", port), Handler).serve_forever()
```

- [ ] **Step 2: 寫失敗的測試**

建立 `scripts/tests/test_supabase_keepalive.sh`：

```bash
#!/usr/bin/env bash
# 測試 scripts/supabase-keepalive.sh。用法：bash scripts/tests/test_supabase_keepalive.sh
set -u
cd "$(dirname "$0")/../.."

PORT=18765
LOG="$(mktemp)"
fail=0

start_mock() {
  : > "$LOG"
  python3 scripts/tests/mock_supabase.py "$PORT" "$1" "$LOG" &
  MOCK_PID=$!
  sleep 0.7
}
stop_mock() { kill "$MOCK_PID" 2>/dev/null; wait "$MOCK_PID" 2>/dev/null; }

run_script() {
  SUPABASE_URL="http://127.0.0.1:${PORT}" SUPABASE_ANON_KEY="test-key" \
    bash scripts/supabase-keepalive.sh >/dev/null 2>"$LOG.err"
}

check() {  # check <名稱> <期望退出碼是否為 0: yes|no> <實際退出碼>
  if { [ "$2" = yes ] && [ "$3" -eq 0 ]; } || { [ "$2" = no ] && [ "$3" -ne 0 ]; }; then
    echo "PASS: $1"
  else
    echo "FAIL: $1 (exit=$3)"; fail=1
  fi
}

# 1. 成功：發出讀取請求（RLS 下回空陣列也算成功），退出碼 0
start_mock ok; run_script; code=$?; stop_mock
check "成功情境退出碼為 0" yes "$code"
grep -q "^GET /rest/v1/collections" "$LOG" && echo "PASS: 有發出讀取請求" || { echo "FAIL: 沒有讀取請求"; fail=1; }

# 2. GET 回 401 → 失敗
start_mock get401; run_script; code=$?; stop_mock
check "GET 401 時失敗" no "$code"

# 3. GET 回 200 但不是 JSON 陣列（閘道錯誤頁）→ 失敗
start_mock get_html; run_script; code=$?; stop_mock
check "GET 回非陣列時失敗" no "$code"
grep -q "不是 JSON 陣列" "$LOG.err" && echo "PASS: 錯誤訊息說明原因" || { echo "FAIL: 錯誤訊息不明確"; fail=1; }

# 4. 缺少環境變數 → 失敗
env -u SUPABASE_URL -u SUPABASE_ANON_KEY bash scripts/supabase-keepalive.sh >/dev/null 2>"$LOG.err"
check "缺少環境變數時失敗" no "$?"

# 5. 伺服器不可達 → 失敗
SUPABASE_URL="http://127.0.0.1:1" SUPABASE_ANON_KEY="k" bash scripts/supabase-keepalive.sh >/dev/null 2>&1
check "伺服器不可達時失敗" no "$?"

rm -f "$LOG" "$LOG.err"
exit "$fail"
```

- [ ] **Step 3: 執行測試，確認失敗**

Run: `bash scripts/tests/test_supabase_keepalive.sh`
Expected: 多筆 FAIL（`scripts/supabase-keepalive.sh` 還不存在，bash 找不到檔案，退出碼非 0，所以「成功情境」會是 FAIL；「應失敗」的情境可能顯示 PASS，但整體以「成功情境 FAIL」為準，總退出碼為 1）。

- [ ] **Step 4: 實作 script**

建立 `scripts/supabase-keepalive.sh`：

```bash
#!/usr/bin/env bash
# Supabase 防暫停：對專案做一次唯讀的資料庫查詢。
# 用法：SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=... bash scripts/supabase-keepalive.sh
# 依據：免費專案 7 天內使用者資料庫活動不足會被暫停。Tu 觀察到平常開 App 就算活動，
# 故只做讀取；若日後仍被暫停，再補寫入（見 docs/OPS_DASHBOARD.md）。
set -euo pipefail

: "${SUPABASE_URL:?缺少環境變數 SUPABASE_URL}"
: "${SUPABASE_ANON_KEY:?缺少環境變數 SUPABASE_ANON_KEY}"

base="${SUPABASE_URL%/}/rest/v1"

# 讀：RLS 下 anon 通常回 []，但仍是一次真實的資料庫查詢。
# --fail 讓 HTTP 4xx／5xx 直接失敗。
resp="$(curl --fail --silent --show-error --max-time 20 \
  -H "apikey: ${SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  "${base}/collections?select=id&limit=1")"

# 閘道錯誤頁可能回 200 的 HTML，回應必須是 JSON 陣列
case "${resp}" in
  \[*) ;;
  *) echo "keepalive 失敗：回應不是 JSON 陣列（可能是閘道錯誤頁或專案已暫停）" >&2; exit 1 ;;
esac

now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "keepalive 成功：${now}"
```

- [ ] **Step 5: 執行測試，確認通過**

Run: `bash scripts/tests/test_supabase_keepalive.sh`
Expected: 全部顯示 PASS，退出碼為 0。

- [ ] **Step 6: Commit**

```bash
git add scripts/supabase-keepalive.sh scripts/tests/mock_supabase.py scripts/tests/test_supabase_keepalive.sh
git commit -m "feat(ops): 新增 Supabase keepalive script（唯讀）與測試" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01UyHKMe35rtKmP8DN1w1kNN"
```

---

### Task 2: 以真實專案實測 keepalive script

**Files:**
- 無（不需要 migration、不新增資料表；只讀既有的 `public.collections`）

**Interfaces:**
- Consumes: Task 1 的 `scripts/supabase-keepalive.sh`；dev 與 prod 的專案 URL 與 anon key
- Produces: 確認 script 對兩個真實專案都成功，且壞金鑰會失敗；Task 3 才能放心排程

- [ ] **Step 1: 對 dev 實測**

由 Tu 在終端機執行（金鑰從 dev 專案 Settings → API Keys 取得，不要貼到對話裡）：

```bash
SUPABASE_URL="https://<dev 專案代碼>.supabase.co" SUPABASE_ANON_KEY="<dev anon key>" bash scripts/supabase-keepalive.sh
```
Expected: 印出 `keepalive 成功：<時間>`。
若出現 401／403：代表 anon 對 `collections` 沒有 SELECT 權限，回報給我，改查另一張 anon 可讀的表或改用 `/rest/v1/` 根路徑；不要自行放寬 RLS。

- [ ] **Step 2: 對 prod 實測**

同 Step 1，URL 與 key 換成 prod 的。
Expected: 同 Step 1。

- [ ] **Step 3: 負向測試**

```bash
SUPABASE_URL="https://<dev 專案代碼>.supabase.co" SUPABASE_ANON_KEY="wrong" bash scripts/supabase-keepalive.sh; echo "exit=$?"
```
Expected: 印出 curl 的 401 錯誤，`exit` 非 0。

---

### Task 3: keepalive 排程 workflow

**Files:**
- Create: `.github/workflows/supabase-keepalive.yml`

**Interfaces:**
- Consumes: Task 1 的 `scripts/supabase-keepalive.sh`；GitHub Secrets `SUPABASE_PROD_URL`、`SUPABASE_PROD_ANON_KEY`、`SUPABASE_DEV_URL`、`SUPABASE_DEV_ANON_KEY`
- Produces: 每日自動執行的 workflow；任一專案失敗時 workflow 變紅，GitHub 寄信給 Tu

- [ ] **Step 1: 寫 workflow**

建立 `.github/workflows/supabase-keepalive.yml`：

```yaml
name: Supabase Keepalive

on:
  schedule:
    # 每日 03:17 UTC（避開整點的排程擁擠）
    - cron: '17 3 * * *'
  workflow_dispatch: # 允許手動觸發

permissions:
  contents: read

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Ping prod
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_PROD_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_PROD_ANON_KEY }}
        run: bash scripts/supabase-keepalive.sh

      # prod 失敗時 dev 仍要 ping，兩邊的失敗都要被看到
      - name: Ping dev
        if: always()
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_DEV_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_DEV_ANON_KEY }}
        run: bash scripts/supabase-keepalive.sh
```

- [ ] **Step 2: 檢查 YAML 語法**

Run: `ruby -ryaml -e 'YAML.load_file(".github/workflows/supabase-keepalive.yml"); puts "yaml ok"'`
Expected: `yaml ok`

- [ ] **Step 3: Commit 並 push**

先確認 Task 1 已 commit，再 push（workflow 要在 main 上才能被 `gh workflow run` 觸發）：

```bash
git add .github/workflows/supabase-keepalive.yml
git commit -m "feat(ops): 新增 Supabase keepalive 每日排程" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01UyHKMe35rtKmP8DN1w1kNN"
git push origin main
```

- [ ] **Step 4: 設定 GitHub Secrets**

由 Tu 在終端機逐一執行（會互動式提示貼上值，不會留在 shell 歷史；請用 `!` 前綴在本 session 執行或自行在終端機執行）：

```bash
gh secret set SUPABASE_PROD_URL
gh secret set SUPABASE_PROD_ANON_KEY
gh secret set SUPABASE_DEV_URL
gh secret set SUPABASE_DEV_ANON_KEY
gh secret list
```
Expected: `gh secret list` 顯示這四個名稱。

- [ ] **Step 5: 手動觸發並確認成功**

Run: `gh workflow run supabase-keepalive.yml && sleep 8 && gh run list --workflow=supabase-keepalive.yml --limit 1`
Expected: 最新一筆狀態為 `completed` 且結論 `success`（若仍在跑，再執行 `gh run watch`）。

- [ ] **Step 6: 負向測試（故意失敗要寄信）**

由 Tu 暫時把 `SUPABASE_DEV_ANON_KEY` 設成錯誤值（`gh secret set SUPABASE_DEV_ANON_KEY` 輸入 `wrong`），再次觸發：

```bash
gh workflow run supabase-keepalive.yml && sleep 8 && gh run list --workflow=supabase-keepalive.yml --limit 1
```
Expected: 結論 `failure`，且 Tu 的 email 收到 GitHub 的失敗通知；prod 步驟為綠、dev 步驟為紅（確認 `if: always()` 生效）。測完用正確的 dev anon key 重新 `gh secret set SUPABASE_DEV_ANON_KEY`，再觸發一次確認回到 `success`。

---

### Task 4: `ops` schema、views 與唯讀角色（migration 檔案）

**Files:**
- Create: `server/migrations/004_ops_dashboard.sql`

**Interfaces:**
- Consumes: `auth.users`（`created_at`、`is_anonymous`）、`public.collections`（`user_id`、`created_at`、`media_type`、`notes`、`rating`、`seasons`）、`public.ai_api_usage`
- Produces: schema `ops`，包含以下 views（Task 7 的 Looker 自訂 SQL 依賴這些欄位名稱）：
  - `ops.v_signups_daily(day date, anonymous_signups bigint, registered_signups bigint, total_signups bigint)`
  - `ops.v_activation(signup_day date, signups bigint, activated_7d bigint, cohort_mature boolean)`
  - `ops.v_retention_proxy(cohort_week date, weeks_since_signup int, active_users bigint, cohort_size bigint)`
  - `ops.v_collections_daily(day date, media_type text, items bigint, with_reflection bigint, with_rating bigint, with_seasons bigint)`
  - `ops.v_ai_usage_daily(day date, endpoint text, provider text, model text, calls bigint, failures bigint, total_tokens bigint, latency_p50_ms double precision, latency_p95_ms double precision)`
  - 角色 `looker_ro`（nologin，Task 5 才設密碼啟用登入）

- [ ] **Step 1: 寫 migration**

建立 `server/migrations/004_ops_dashboard.sql`：

```sql
-- Migration 004: 新增 ops schema（營運 dashboard 的彙總 views 與唯讀角色）
-- Design doc: docs/superpowers/specs/2026-10-23-ops-dashboard-design.md
--
-- 背景：Looker Studio 以唯讀角色 looker_ro 讀取這些預先彙總的 views。
-- ops schema 不加入 Supabase API 對外公開的 schema 清單，anon / authenticated 讀不到。
-- views 以擁有者（postgres）權限執行，looker_ro 因此只需要對 views 有 SELECT，
-- 對 auth、public 基礎表完全沒有權限。
--
-- 注意：
-- * 日期一律以 UTC 分組（台灣晚間建立的資料會落在前一天）。
-- * 留存以「建立收藏（collections.created_at）」作活躍代理，看不到單純開啟 App。
-- * 註冊不滿 7 天的 cohort 啟用率會偏低，用 cohort_mature 過濾。
-- * 角色密碼不寫在這個檔案：執行本檔後，另外在 SQL Editor 手動執行
--   ALTER ROLE looker_ro LOGIN PASSWORD '<產生的英數字密碼>'（見 docs/OPS_DASHBOARD.md）。
--
-- 執行方式：在 Supabase Dashboard > SQL Editor 執行（prod）。
-- 冪等：可重複執行（create or replace / if not exists）。

create schema if not exists ops;

-- 1. 每日新註冊（匿名與已登入分開）
create or replace view ops.v_signups_daily as
select
  (created_at at time zone 'UTC')::date as day,
  count(*) filter (where is_anonymous) as anonymous_signups,
  count(*) filter (where not is_anonymous) as registered_signups,
  count(*) as total_signups
from auth.users
group by 1;

-- 2. 啟用率：依註冊日分群，7 天內至少新增 1 筆收藏的人數
create or replace view ops.v_activation as
select
  (u.created_at at time zone 'UTC')::date as signup_day,
  count(*) as signups,
  count(*) filter (where exists (
    select 1 from public.collections c
    where c.user_id = u.id
      and c.created_at < u.created_at + interval '7 days'
  )) as activated_7d,
  ((u.created_at at time zone 'UTC')::date <= (now() at time zone 'UTC')::date - 7) as cohort_mature
from auth.users u
group by 1, 4;

-- 3. 留存代理：依註冊週分群，之後每週有新增收藏的人數
create or replace view ops.v_retention_proxy as
with cohort as (
  select id, date_trunc('week', created_at at time zone 'UTC')::date as cohort_week
  from auth.users
),
sizes as (
  select cohort_week, count(*) as cohort_size from cohort group by 1
),
activity as (
  select distinct user_id, date_trunc('week', created_at at time zone 'UTC')::date as active_week
  from public.collections
)
select
  c.cohort_week,
  ((a.active_week - c.cohort_week) / 7)::int as weeks_since_signup,
  count(distinct c.id) as active_users,
  s.cohort_size
from cohort c
join sizes s on s.cohort_week = c.cohort_week
join activity a on a.user_id = c.id and a.active_week >= c.cohort_week
group by c.cohort_week, 2, s.cohort_size;

-- 4. 每日收藏：依類型、心得填寫、評分、分季使用
create or replace view ops.v_collections_daily as
select
  (created_at at time zone 'UTC')::date as day,
  media_type,
  count(*) as items,
  count(*) filter (where notes is not null and btrim(notes) <> '') as with_reflection,
  count(*) filter (where rating is not null and rating > 0) as with_rating,
  count(*) filter (where seasons is not null and cardinality(seasons) > 0) as with_seasons
from public.collections
group by 1, 2;

-- 5. 每日 AI 用量：呼叫、失敗、token、延遲（不內建費用換算，單價會變）
create or replace view ops.v_ai_usage_daily as
select
  (created_at at time zone 'UTC')::date as day,
  endpoint,
  provider,
  model,
  count(*) as calls,
  count(*) filter (where not success) as failures,
  coalesce(sum(total_tokens), 0) as total_tokens,
  percentile_cont(0.5) within group (order by latency_ms) as latency_p50_ms,
  percentile_cont(0.95) within group (order by latency_ms) as latency_p95_ms
from public.ai_api_usage
group by 1, 2, 3, 4;

-- 唯讀角色（先 nologin，密碼另外手動設定）
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'looker_ro') then
    create role looker_ro nologin;
  end if;
end
$$;

alter role looker_ro connection limit 5;
alter role looker_ro set statement_timeout = '30s';

-- 權限：只對 ops views 有 SELECT；anon / authenticated 一律沒有
revoke all on schema ops from public, anon, authenticated;
revoke all on all tables in schema ops from public, anon, authenticated;
grant usage on schema ops to looker_ro;
grant select on all tables in schema ops to looker_ro;

-- 驗證（執行後手動確認）
-- SELECT count(*) FROM ops.v_signups_daily;
-- SELECT sum(total_signups) FROM ops.v_signups_daily;  -- 應等於 SELECT count(*) FROM auth.users;
```

- [ ] **Step 2: 在 dev 先做 dry run（確認語法與欄位）**

由 Tu 在 **dev** 專案 SQL Editor 執行整份檔案。若出現 `relation "public.ai_api_usage" does not exist`，先在 dev 執行 `server/migrations/003_ai_api_usage.sql`（冪等）再重跑；若出現欄位不存在（例如 `seasons`、`notes`），先在 dev 套用 `server/migrations/002_add_seasons.sql`。
Expected: 整份檔案執行成功，無錯誤。

- [ ] **Step 3: 在 dev 驗證各 view 可查詢**

由 Tu 在 dev 的 SQL Editor 分別執行：

```sql
select * from ops.v_signups_daily order by day desc limit 3;
select * from ops.v_activation order by signup_day desc limit 3;
select * from ops.v_retention_proxy order by cohort_week desc limit 3;
select * from ops.v_collections_daily order by day desc limit 3;
select * from ops.v_ai_usage_daily order by day desc limit 3;
```
Expected: 五個查詢都不報錯（dev 資料很少或為 0 列也算通過，這同時驗證「空資料不報錯」）。

- [ ] **Step 4: 刪除 dev 的 ops schema**

spec 規定 `ops` 只留在 prod。由 Tu 在 dev 的 SQL Editor 執行：

```sql
drop schema ops cascade;
drop role if exists looker_ro;
```
Expected: 成功。（若 `drop role` 因仍有權限相依而失敗，先執行 `drop owned by looker_ro;` 再 `drop role looker_ro;`。）

- [ ] **Step 5: Commit**

```bash
git add server/migrations/004_ops_dashboard.sql
git commit -m "feat(ops): 新增 ops schema、彙總 views 與唯讀角色 migration" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01UyHKMe35rtKmP8DN1w1kNN"
```

---

### Task 5: 套用 `ops` 到 prod 並驗證權限與數字

**Files:**
- 無新增檔案（操作 prod 資料庫）

**Interfaces:**
- Consumes: Task 4 的 `server/migrations/004_ops_dashboard.sql`
- Produces: prod 上可登入的 `looker_ro`；Task 7 以 `looker_ro.<專案代碼>` 帳號連線 session pooler

- [ ] **Step 1: 套用到 prod**

由 Tu 在 **prod** 專案 SQL Editor 執行 `server/migrations/004_ops_dashboard.sql` 整份。
Expected: 成功，無錯誤。

- [ ] **Step 2: 產生並設定 `looker_ro` 密碼**

由 Tu 在終端機產生密碼（只含英數字，存進密碼管理器，不要貼到對話或 repo）：

```bash
openssl rand -base64 24 | tr -d '/+=' | cut -c1-24
```
再到 prod 的 SQL Editor 執行（把輸出貼進單引號內；這行不要存成檔案）：

```sql
alter role looker_ro login password '<剛產生的密碼>';
```
Expected: 成功。

- [ ] **Step 3: 對帳——view 數字等於手寫 SQL**

由 Tu 在 prod SQL Editor 執行：

```sql
select
  (select sum(total_signups) from ops.v_signups_daily)  as view_total,
  (select count(*) from auth.users)                      as actual_total,
  (select sum(items) from ops.v_collections_daily)       as view_items,
  (select count(*) from public.collections)              as actual_items,
  (select coalesce(sum(calls), 0) from ops.v_ai_usage_daily) as view_ai_calls,
  (select count(*) from public.ai_api_usage)             as actual_ai_calls;
```
Expected: 三組數字兩兩相等（`view_total = actual_total`、`view_items = actual_items`、`view_ai_calls = actual_ai_calls`）。

- [ ] **Step 4: 空資料與未成熟 cohort**

由 Tu 在 prod SQL Editor 執行：

```sql
select count(*) from ops.v_ai_usage_daily where day >= current_date + 1;  -- 未來日期，必為 0 列，不應報錯
select signup_day, signups, activated_7d, cohort_mature from ops.v_activation order by signup_day desc limit 10;
```
Expected: 第一個查詢回 `0` 不報錯；第二個查詢中，最近 7 天內的列 `cohort_mature = false`，更早的列為 `true`。

- [ ] **Step 5: 權限測試——`looker_ro` 不能越權**

由 Tu 在 prod SQL Editor **逐條單獨執行**（每條失敗後 session 狀態會中止，所以分開跑，並在每條之間執行 `reset role;`）：

```sql
set role looker_ro; select count(*) from ops.v_signups_daily;
```
Expected: 成功回傳數字。

```sql
reset role; set role looker_ro; select count(*) from public.collections;
```
Expected: 失敗，`permission denied for table collections`。

```sql
reset role; set role looker_ro; select count(*) from auth.users;
```
Expected: 失敗，`permission denied`（schema auth 或表 users）。

```sql
reset role;
```

- [ ] **Step 6: 權限測試——`ops` 不能被 Supabase REST API 讀到**

由 Tu 在終端機執行（用 prod 的 anon key，不要貼到對話）：

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: <prod anon key>" -H "Authorization: Bearer <prod anon key>" \
  -H "Accept-Profile: ops" \
  "https://<prod 專案代碼>.supabase.co/rest/v1/v_signups_daily?limit=1"
```
Expected: `406`、`404` 或 `403`（schema 未對外公開），**不是** `200`。

- [ ] **Step 7: 以 `looker_ro` 實際連線（pooler）**

由 Tu 到 Supabase Dashboard → Connect → Session pooler 複製連線資訊（主機與埠 5432），用 psql 測試（密碼用 `PGPASSWORD` 環境變數帶入，不要寫進指令列歷史）：

```bash
PGPASSWORD='<looker_ro 密碼>' psql "host=<session pooler 主機> port=5432 dbname=postgres user=looker_ro.<專案代碼> sslmode=require" -c "select count(*) from ops.v_signups_daily;"
```
Expected: 回傳一個數字（Task 0 已在 dev 驗證過機制，這裡確認 prod 的主機與專案代碼也通）。若 pooler 拒絕自訂角色，記錄錯誤訊息，改採 spec 第 7 節的後備方案（n8n 每日把 view 結果寫進 Google Sheet 再讓 Looker 讀），並暫停 Task 7 直到 Tu 決定。

---

### Task 6: UptimeRobot 監控

**Files:**
- 無新增檔案（外部服務設定）

**Interfaces:**
- Consumes: 後端 `https://storio2-production.up.railway.app`、Web `https://storio.andismtu.com/`、落地頁 `https://ziziandydy.github.io/storio_2/`、Puppeteer 服務的 `/health`
- Produces: 6 個監控與通知；Task 7 的「健康」分頁連結 UptimeRobot 狀態頁

- [ ] **Step 1: 先用 curl 確認每個關鍵字目前真的存在**

Run:
```bash
B=https://storio2-production.up.railway.app
curl -s -m 30 "$B/" | grep -c '"status":"online"'
curl -s -m 30 "$B/api/v1/search/?q=inception" | grep -c '"source":"tmdb"'
curl -s -m 30 "$B/api/v1/search/?q=dune+frank+herbert" | grep -c '"source":"google_books"'
curl -s -o /dev/null -w "%{http_code}\n" https://storio.andismtu.com/
curl -s -o /dev/null -w "%{http_code}\n" https://ziziandydy.github.io/storio_2/
```
Expected: 前三行數字皆 `≥ 1`；後兩行皆為 `200`。任何一項不符，先修正關鍵字或查原因，不要直接建監控。

- [ ] **Step 2: 查 Puppeteer 服務的健康檢查網址**

Puppeteer 分享服務已遷移到 Railway（公開網址見 `client/.env.production` 的 `NEXT_PUBLIC_PUPPETEER_SERVICE_URL`，目前為 `https://worthy-beauty-production.up.railway.app`），請確認：

```bash
curl -s -m 60 -o /dev/null -w "%{http_code}\n" https://<Puppeteer 服務網址>/health
```
Expected: `200`，內容為 `{"status":"ok",...}`（Railway 服務不休眠，我已實測回 200）。

- [ ] **Step 3: 在 UptimeRobot 建立 6 個監控**

由 Tu 註冊 UptimeRobot 免費帳號（自己登入與建帳號，我不代為操作），依下表建立，檢查間隔：`Backend TMDB`、`Backend Google Books` 設 15 分鐘（會讓後端去打 TMDB 與 Google，降低 Railway 用量與外部額度消耗），其餘 4 個設免費版最短的 5 分鐘。通知寄 Tu 的 email：

| 名稱 | 類型 | 網址 | 關鍵字（Keyword 類型） |
|---|---|---|---|
| Backend alive | Keyword | `https://storio2-production.up.railway.app/` | `online`（存在才正常） |
| Backend TMDB | Keyword | `https://storio2-production.up.railway.app/api/v1/search/?q=inception` | `"source":"tmdb"`（存在才正常） |
| Backend Google Books | Keyword | `https://storio2-production.up.railway.app/api/v1/search/?q=dune+frank+herbert` | `"source":"google_books"`（存在才正常） |
| Web App | HTTP(s) | `https://storio.andismtu.com/` | — |
| Landing page | HTTP(s) | `https://ziziandydy.github.io/storio_2/` | — |
| Puppeteer | HTTP(s) | `https://<Puppeteer 服務網址>/health` | — |

Expected: 6 個監控都顯示 Up。

**成本估算**：打到 Railway 的請求約每天 288（存活）＋ 96×2（兩項內容檢查）＋ 288（Puppeteer `/health`）≈ 770 次，皆為幾 KB 的 GET，對 Railway 用量的影響可忽略；一個月後到 Railway Usage 頁確認沒有明顯增加。

- [ ] **Step 4: 失敗模擬**

由 Tu 暫時把 `Backend TMDB` 的關鍵字改成 `"source":"tmdb_BROKEN"`，等 5 到 10 分鐘。
Expected: 該監控轉為 Down 並寄出通知 email。確認後改回 `"source":"tmdb"`，等它回到 Up。

- [ ] **Step 5: 建立公開狀態頁並確認通知管道**

由 Tu 在 UptimeRobot 建立一個 status page 顯示這 6 個監控（免費版有基本狀態頁），記下網址；並確認手機是否可收通知：先安裝 UptimeRobot 的手機 App 試登入，若沒有或不支援推播，改在 UptimeRobot 的 Alert Contacts 加上 email（免費版僅 5 個整合，Telegram 若可用就加）。把狀態頁網址與選定的通知管道告訴我，我會寫進 Task 8 的手冊。

---

### Task 7: Looker Studio 報表

**Files:**
- 無新增檔案（外部服務設定）

**Interfaces:**
- Consumes: Task 5 驗證過的 `looker_ro` 帳號、Task 4 的五個 views、Task 6 的狀態頁網址
- Produces: 一份只有 Tu 的 Google 帳號可看的 Looker Studio 報表，三個分頁：成長、AI 與成本、健康

- [ ] **Step 1: 建立資料來源（以自訂 SQL）**

由 Tu 在 Looker Studio 新增 PostgreSQL 連接器，參數：
- 主機：Task 5 Step 7 使用的 session pooler 主機
- 連接埠：`5432`
- 資料庫：`postgres`
- 使用者名稱：`looker_ro.<專案代碼>`
- 密碼：Task 5 Step 2 產生的密碼
- 勾選「Enable SSL」並上傳 Supabase 根憑證（Task 0 實測：Dashboard → Database → Settings → SSL Configuration 下載 `prod-ca-2021.crt`；Looker 的上傳框只收 `.pem`，需先複製改名為 `.pem`，本機已有 `~/Downloads/prod-ca-2021.pem`）。**不要**勾「Enable client authentication」，客戶端憑證與私鑰留空
- 連接器的資料表清單會是空的（只列 `public` 且 `looker_ro` 無權限），屬正常現象，直接用下方的自訂查詢
- Data freshness 預設為 12 小時，符合本報表「非即時」的需求，不必調整
- 若 Looker 因 IP 被擋而連不上：Supabase 預設沒有 IP 限制，若有設 Network Restrictions，加入 Google 官方列出的 Looker Studio IP 範圍後重試

接著為下列每個查詢各建立一個自訂查詢資料來源（連接器不支援直接選 `ops` schema 的表）：

```sql
select * from ops.v_signups_daily
select * from ops.v_activation
select * from ops.v_retention_proxy
select * from ops.v_collections_daily
select * from ops.v_ai_usage_daily
```
Expected: 五個資料來源都能預覽出資料（可為空列）。若連線失敗，停止並回到 Task 5 Step 7 的後備方案。

- [ ] **Step 2: 建立「成長」分頁**

圖表與計算欄位（圖表標題都標明「UTC」）：

| 圖表 | 資料來源 | 設定 |
|---|---|---|
| 新註冊趨勢（UTC） | `v_signups_daily` | 折線圖，維度 `day`，指標 `anonymous_signups`、`registered_signups` |
| 啟用率 | `v_activation` | 純量卡片，篩選 `cohort_mature = true`；計算欄位 `SUM(activated_7d) / SUM(signups)` |
| 啟用率趨勢 | `v_activation` | 折線圖，篩選 `cohort_mature = true`，維度 `signup_day`，同上計算欄位 |
| 留存代理 | `v_retention_proxy` | 資料透視表：列 `cohort_week`、欄 `weeks_since_signup`、值 `active_users / cohort_size`（計算欄位 `SUM(active_users) / MAX(cohort_size)`） |
| 每日新增收藏（UTC） | `v_collections_daily` | 堆疊長條圖，維度 `day`，拆分 `media_type`，指標 `items` |
| 心得、評分、分季使用率 | `v_collections_daily` | 三張純量卡片：`SUM(with_reflection)/SUM(items)`、`SUM(with_rating)/SUM(items)`、`SUM(with_seasons)/SUM(items)` |

頁面註解寫上：留存以「建立收藏」近似，看不到單純開啟 App；註冊不滿 7 天的資料不計入啟用率。

- [ ] **Step 3: 建立「AI 與成本」分頁**

| 圖表 | 資料來源 | 設定 |
|---|---|---|
| 每日呼叫量 | `v_ai_usage_daily` | 堆疊長條圖，維度 `day`，拆分 `endpoint`，指標 `calls` |
| 失敗率 | `v_ai_usage_daily` | 折線圖，維度 `day`，計算欄位 `SUM(failures) / SUM(calls)` |
| 每日 token | `v_ai_usage_daily` | 折線圖，維度 `day`，拆分 `provider`，指標 `total_tokens` |
| 延遲 | `v_ai_usage_daily` | 折線圖，維度 `day`，指標 `latency_p50_ms`、`latency_p95_ms` |

頁面註解寫上：AI 用量沒有 user_id，看不到每人用量；失敗率每日更新，不是即時警報（金鑰失效最慢隔天發現）。

- [ ] **Step 4: 建立「健康」分頁（只放連結）**

文字與連結元件：UptimeRobot 狀態頁（Task 6 的網址）、Railway 專案 Metrics 分頁（後端與 Puppeteer 同在 Railway）、Supabase 專案首頁。**不使用 iframe 嵌入**（spec 5.4：外部網頁能否嵌入未驗證）。

- [ ] **Step 5: 分享設定與手機驗證**

由 Tu 設定報表分享為「僅限特定使用者」，只加入自己的 Google 帳號，**不設定公開**。再用手機行動網路（關閉 Wi-Fi）開啟報表連結。
Expected: 三個分頁都能載入並可切換；Tu 在電腦休眠時也能開啟。把報表連結告訴我，我會寫進 Task 8 的手冊。

---

### Task 8: 維運手冊

**Files:**
- Create: `docs/OPS_DASHBOARD.md`

**Interfaces:**
- Consumes: Task 6 的狀態頁網址與通知管道、Task 7 的報表連結
- Produces: `docs/OPS_DASHBOARD.md` — 之後維護與擴充 dashboard 的唯一入口

- [ ] **Step 1: 撰寫手冊**

建立 `docs/OPS_DASHBOARD.md`，把 Task 6 Step 5 與 Task 7 Step 5 取得的實際網址填入對應位置：

```markdown
# Storio 營運 Dashboard 維運手冊

> 設計：`docs/superpowers/specs/2026-10-23-ops-dashboard-design.md`
> 計畫：`docs/superpowers/plans/2026-10-23-ops-dashboard.md`

## 入口

- 報表（Looker Studio，僅限 Tu 的 Google 帳號）：<Task 7 Step 5 取得的連結>
- 即時健康（UptimeRobot 狀態頁）：<Task 6 Step 5 取得的網址>
- 通知管道：<Task 6 Step 5 選定的管道>

## 組成

| 元件 | 位置 | 做什麼 |
|---|---|---|
| keepalive | `.github/workflows/supabase-keepalive.yml`、`scripts/supabase-keepalive.sh` | 每日 03:17 UTC 對 prod 與 dev 各做一次唯讀查詢，失敗時 GitHub 寄信 |
| `ops` views | `server/migrations/004_ops_dashboard.sql`（只存在 prod） | 彙總註冊、啟用、留存代理、收藏、AI 用量 |
| `looker_ro` | prod 資料庫角色 | 只能讀 `ops` views |
| 監控 | UptimeRobot 免費版（限非商業用途） | 6 個 HTTP／Keyword 監控，含 TMDB 與 Google Books 靜默失敗偵測 |

## 常見維護

### 輪替 `looker_ro` 密碼
1. 終端機：`openssl rand -base64 24 | tr -d '/+=' | cut -c1-24`
2. Supabase prod SQL Editor：`alter role looker_ro login password '<新密碼>';`
3. Looker Studio 各資料來源重新授權（更新密碼）。
4. 密碼只存在密碼管理器，不放 repo。

### 新增一個指標
1. 在新的 migration（例如 `006_*.sql`）用 `create or replace view ops.v_xxx` 建 view，保持預先彙總（Looker 單次查詢上限 15 萬列）。
2. 對 `looker_ro` 授權：`grant select on ops.v_xxx to looker_ro;`
3. 在 Looker Studio 新增自訂查詢資料來源 `select * from ops.v_xxx`。
4. 日期一律 UTC。

### Supabase 專案被暫停了
1. 看 GitHub 是否有 `Supabase Keepalive` 失敗信，確認是 prod 還是 dev。
2. 到 Supabase Dashboard 按 Restore project。
3. 還原後手動觸發：`gh workflow run supabase-keepalive.yml`。
4. 若反覆被暫停，評估升級 Supabase Pro。

## 已知限制

- 留存以「建立收藏」近似，看不到單純開啟 App。
- AI 用量沒有 user_id，看不到每人用量。
- 資料庫健康只有每日 keepalive，沒有 5 分鐘即時偵測（`/search/trending/*` 有程序內記憶體快取，不能當 DB 檢查）。
- AI 金鑰失效最慢隔天從失敗率發現。
- 日期為 UTC，台灣晚間資料會落在前一天。
- UptimeRobot 免費版限非商業用途，Storio 若開始變現需改用付費方案或 BetterStack。
- 網域 `andismtu.com` 到期沒有自動提醒，請在註冊商或行事曆設定。

## 驗證 keepalive 是否有效

官方未保證，只能觀察：之後若不再收到 Supabase 的「專案即將暫停」警告信，就是有效。若仍被暫停（或收到「專案即將暫停」警告信），在 script 補上寫入（需新增一張只有一列時間戳的 `public.keepalive` 表加 RLS），再不行升級 Pro。
```

- [ ] **Step 2: 手冊內容檢查**

Run: `grep -n "<Task" docs/OPS_DASHBOARD.md`
Expected: 沒有任何輸出（表示所有網址都已填入實際值，沒有殘留的待填標記）。

- [ ] **Step 3: Commit**

```bash
git add docs/OPS_DASHBOARD.md
git commit -m "docs(ops): 新增營運 dashboard 維運手冊" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01UyHKMe35rtKmP8DN1w1kNN"
```
