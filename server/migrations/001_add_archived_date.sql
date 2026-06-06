-- Migration 001: 新增 archived_date 欄位（收藏日期模型）
-- OpenSpec change: archived-date-field
--
-- 背景：created_at (timestamp) 原同時承擔「建立時間」與「使用者收藏日」。
-- 前端用 new Date('YYYY-MM-DD') 把純日期當 UTC 午夜，負時區顯示減一天。
-- 拆出 archived_date (date)：純日期無時區，存什麼顯什麼。
--
-- 執行方式：在 Supabase Dashboard > SQL Editor 執行（動 production schema）。
-- 冪等：可重複執行（WHERE archived_date IS NULL 確保不覆蓋已填值）。

-- 1. 新增 archived_date 欄位（nullable，向後相容）
ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS archived_date date;

-- 2. 回填現有資料：用 created_at 的日期部分
UPDATE collections
  SET archived_date = created_at::date
  WHERE archived_date IS NULL;

-- 3. 驗證（執行後手動確認）
-- SELECT id, created_at, archived_date FROM collections ORDER BY created_at DESC LIMIT 5;
