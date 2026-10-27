-- Migration 005: 營運 dashboard 新增「近 7／30 天活躍人數」views
-- Design doc: docs/superpowers/specs/2026-10-23-ops-dashboard-design.md
--
-- 背景：Tu 想直接看到近一週／近一個月的上線人數、有新增收藏的人數、新註冊人數。
-- 執行方式：到 prod 專案 SQL Editor 貼上整份執行（可重複執行）。
--
-- 注意：
-- * 「上線」以 auth.sessions 的最後更新時間近似：App 開啟期間 Supabase 會定期刷新 session，
--   所以比 last_sign_in_at（匿名用戶幾乎不更新）準；但用戶久未開 App 時 token 不刷新，
--   仍可能少算，屬於「至少有這麼多人」的下限。
-- * 「有新增收藏」以 public.collections.created_at 計。
-- * 時間窗為「現在往前 7／30 天」的滾動窗，不是日曆週／月；日期分組一律 UTC。

-- 1. 單列總覽：卡片直接用
create or replace view ops.v_activity_summary as
select
  (select count(distinct user_id) from auth.sessions
    where coalesce(updated_at, created_at) >= now() - interval '7 days')  as online_users_7d,
  (select count(distinct user_id) from auth.sessions
    where coalesce(updated_at, created_at) >= now() - interval '30 days') as online_users_30d,
  (select count(distinct user_id) from public.collections
    where created_at >= now() - interval '7 days')                         as collecting_users_7d,
  (select count(distinct user_id) from public.collections
    where created_at >= now() - interval '30 days')                        as collecting_users_30d,
  (select count(*) from auth.users
    where created_at >= now() - interval '7 days')                         as new_signups_7d,
  (select count(*) from auth.users
    where created_at >= now() - interval '30 days')                        as new_signups_30d,
  (select count(*) from auth.users)                                        as total_users;

-- 2. 每日趨勢：每天有上線、有新增收藏的人數
create or replace view ops.v_active_daily as
with online as (
  select (coalesce(updated_at, created_at) at time zone 'UTC')::date as day,
         count(distinct user_id) as online_users
  from auth.sessions
  group by 1
),
collecting as (
  select (created_at at time zone 'UTC')::date as day,
         count(distinct user_id) as collecting_users
  from public.collections
  group by 1
)
select
  coalesce(o.day, c.day) as day,
  coalesce(o.online_users, 0) as online_users,
  coalesce(c.collecting_users, 0) as collecting_users
from online o
full join collecting c on c.day = o.day;

-- 權限：與 004 相同，只給 looker_ro SELECT
revoke all on ops.v_activity_summary, ops.v_active_daily from public, anon, authenticated;
grant select on ops.v_activity_summary, ops.v_active_daily to looker_ro;

-- 驗證（執行後手動確認）
-- SELECT * FROM ops.v_activity_summary;
-- SELECT new_signups_30d FROM ops.v_activity_summary;  -- 應等於 v_signups_daily 近 30 天 total_signups 加總
-- SELECT count(*) FROM auth.sessions;                  -- 若為 0，表示此專案不保留 session，「上線」需改用其他來源
