-- Migration 002: 新增 seasons 欄位（分季收藏）
-- Design doc: docs/superpowers/specs/2026-08-01-seasons-design.md
--
-- 背景：同一部影集（尤其 TV）可能分次收藏不同季數（如今年看完 S1-S3、
-- 明年看完 S4-S6）。每筆收藏維持獨立 row（沿用既有多次記錄機制），
-- 新增 seasons 記錄這筆涵蓋哪幾季（TMDB season_number 陣列）。
-- 僅 media_type = 'tv' 有意義；movie/book 恆為 null。
--
-- 執行方式：在 Supabase Dashboard > SQL Editor 執行（動 production schema）。
-- 冪等：可重複執行（IF NOT EXISTS）。不回填舊資料——舊的 TV 收藏 seasons
-- 維持 null，前端會 fallback 顯示「第 N 次」而非季數範圍。

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS seasons integer[];

-- 驗證（執行後手動確認）
-- SELECT id, title, media_type, seasons FROM collections WHERE media_type = 'tv' ORDER BY created_at DESC LIMIT 5;
