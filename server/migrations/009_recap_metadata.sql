-- Migration 009: 年度 Recap 作品資料欄位
-- Design doc: docs/superpowers/specs/2026-11-10-year-recap-design.md §5
-- OpenSpec: openspec/changes/year-recap/specs/recap-data/spec.md
--
-- 背景：片長、類別、頁數過去只在詳情頁即時向 TMDB／Google Books 取得、沒有落地，
-- 所以「花了多少時間」「偏愛什麼類別」算不出來。這四個欄位讓 Recap 統計有資料可用：
--   runtime_minutes : 電影單部片長；影集單集片長（分鐘）
--   episode_total   : 影集該筆收藏涵蓋的總集數（僅 tv 有意義）
--   genres          : 類別英文名陣列（書為正規化後的 Google Books 類別）
--   page_count      : 書的頁數
--   metadata_fetched_at : 上次向外部取詳情的時間（補抓成功即記錄，不論取到幾個欄位）；
--                         TMDB／Google Books 常沒有片長、集數，靠它避免每次開 Recap 都重打外部 API
-- 全部可為 null；舊資料不在此 migration 回填——由 Recap 第一次計算時補抓並寫回。
--
-- 執行方式：先在 Supabase **dev** 專案的 SQL Editor 執行並跑驗證查詢，確認後再執行於 prod。
-- 冪等：可重複執行（IF NOT EXISTS）；後端不需等 migration 才能部署（新增欄位為 null 時不會送出）。

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS runtime_minutes integer,
  ADD COLUMN IF NOT EXISTS episode_total integer,
  ADD COLUMN IF NOT EXISTS genres text[],
  ADD COLUMN IF NOT EXISTS page_count integer,
  ADD COLUMN IF NOT EXISTS metadata_fetched_at timestamptz;

-- 驗證（執行後手動確認：5 欄位皆存在、既有列皆為 null）
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'collections'
--     AND column_name IN ('runtime_minutes', 'episode_total', 'genres', 'page_count', 'metadata_fetched_at');
-- SELECT count(*) FILTER (WHERE runtime_minutes IS NOT NULL OR episode_total IS NOT NULL
--                          OR genres IS NOT NULL OR page_count IS NOT NULL
--                          OR metadata_fetched_at IS NOT NULL) AS filled,
--        count(*) AS total FROM collections;
