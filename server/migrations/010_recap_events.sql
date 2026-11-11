-- Migration 010: 年度 Recap 互動事件（recap_opened、recap_shared，含年份與場景數）
-- Design doc: docs/superpowers/specs/2026-11-10-year-recap-design.md §5
-- OpenSpec: openspec/changes/year-recap/specs/recap-share/spec.md（互動事件）
-- 計畫: docs/superpowers/plans/2026-11-11-year-recap-phase2b-share.md Task 4
--
-- 背景：engagement_events（006）記錄每日互動，去重鍵是「主體＋事件＋平台＋UTC 日」，沒有承載年份與場景數的欄位。
-- Recap 要記錄：
--   recap_opened ：用戶開啟某一年的 Recap（year 必填）
--   recap_shared ：用戶完成分享（year 與 scene_count 必填；scene_count＝實際分享的場景張數）
-- 所以本 migration：
--   1. 新增 year、scene_count 兩個欄位（皆可為 null；既有事件不受影響）。
--   2. 放寬 event 的 CHECK，加入 recap_opened、recap_shared；並要求 recap 事件必須帶 year（recap_shared 另需 scene_count）。
--   3. 去重索引改版，納入 year 與 scene_count：同一用戶同一天開啟不同年份的 Recap、或以不同張數分享，各記一筆；
--      完全相同的重複事件仍去重（後端撞到 23505 視為成功）。
-- 報表 view（ops.v_engagement_daily、ops.v_engagement_rate_weekly）不列舉事件名，會自動多出這兩個事件；
-- Looker 若有固定事件清單，需手動加入。
--
-- 執行方式：先在 Supabase **dev** 專案的 SQL Editor 貼上整份執行並跑驗證查詢，確認後再執行於 prod。
-- 冪等：可重複執行（IF NOT EXISTS／DROP … IF EXISTS）。
-- 部署順序：後端與前端要等本 migration 在對應環境執行後才會送出 recap 事件；未執行前送出會被約束擋下（前端 track 會吞掉錯誤，不影響用戶）。

begin;

-- 1. 新欄位
alter table public.engagement_events
  add column if not exists year smallint null,
  add column if not exists scene_count smallint null;

-- 2. 約束（先 drop 再建，確保重複執行也安全）
alter table public.engagement_events drop constraint if exists engagement_events_event_check;
alter table public.engagement_events
  add constraint engagement_events_event_check
  check (event in ('open', 'browse', 'detail_view', 'search', 'add_collection', 'share', 'recap_opened', 'recap_shared'));

alter table public.engagement_events drop constraint if exists engagement_events_year_check;
alter table public.engagement_events
  add constraint engagement_events_year_check
  check (year is null or year between 1970 and 2100);

alter table public.engagement_events drop constraint if exists engagement_events_scene_count_check;
alter table public.engagement_events
  add constraint engagement_events_scene_count_check
  check (scene_count is null or scene_count between 1 and 30);

alter table public.engagement_events drop constraint if exists engagement_events_recap_fields;
alter table public.engagement_events
  add constraint engagement_events_recap_fields
  check (
    (event not in ('recap_opened', 'recap_shared') or year is not null)
    and (event <> 'recap_shared' or scene_count is not null)
  );

-- 3. 去重索引改版：先建新的、再刪舊的（既有列 year／scene_count 皆為 null，coalesce 成 0，不會衝突）
create unique index if not exists engagement_events_dedupe_v2
  on public.engagement_events (coalesce(user_id, visitor_id), event, platform, day, coalesce(year, 0), coalesce(scene_count, 0));

drop index if exists public.engagement_events_dedupe;

commit;

-- 驗證（執行後手動確認）
-- 1) 欄位存在：應回 2 列（year smallint、scene_count smallint）
-- select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'engagement_events' and column_name in ('year', 'scene_count');
-- 2) event 約束包含 recap 事件：定義中應有 'recap_opened' 與 'recap_shared'
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'engagement_events_event_check';
-- 3) 索引：應只剩 engagement_events_dedupe_v2（不再有 engagement_events_dedupe）
-- select indexname from pg_indexes where schemaname = 'public' and tablename = 'engagement_events' order by indexname;
-- 4) 既有事件不受影響：year／scene_count 全為 null，總數與執行前相同
-- select count(*) as total, count(year) as with_year, count(scene_count) as with_scene_count from public.engagement_events;
