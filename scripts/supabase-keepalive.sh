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
