-- Migration 006: 互動事件記錄（engagement_events）與 ops 互動報表 views
-- Design doc: docs/superpowers/specs/2026-10-29-engagement-events-design.md
-- OpenSpec: openspec/changes/add-engagement-events/
--
-- 背景：營運報表的上線人數原本只能用 auth.sessions 近似，看不到「打開之後做了什麼」，
-- 也分不出真人與爬蟲。這張表記錄六種互動事件（open／browse／detail_view／search／
-- add_collection／share），依平台分開、同一主體同一天同一事件只存一列，用來算
-- engagement rate；沒有帳號的疑似爬蟲以隨機訪客代號（visitor_id）另外計數。
--
-- 注意：
-- * 只有後端 service role 寫入；RLS 開啟且不建 policy，anon／authenticated 讀寫不到。
-- * 不存搜尋字串、作品 ID、心得、IP 原文、User-Agent 原文。
-- * 帳號刪除時事件由 on delete cascade 一併刪除；「清除資料」（只清收藏）不刪事件。
-- * day 一律為 UTC 日期，由後端寫入。
-- * engagement rate 與「真實用戶」只算帳號（user_id）；訪客代號（visitor_id）與 is_suspected_bot
--   都是前端自報、可偽造，只用於「疑似爬蟲來訪次數」（v_engagement_daily）。
-- * 週 engagement rate 的分子只算同週同平台也有 open 的主體，所以比率不超過 1；
--   舊版 App 只有後端記的 add_collection、沒有 open，這些人不進比率，但會進「真實用戶」。
-- * 疑似爬蟲常不保留 localStorage，訪客代號的數字較接近「來訪次數」。
--
-- 執行方式：在 Supabase Dashboard > SQL Editor 貼上整份執行（先 dev 再 prod）。
-- 冪等：可重複執行（if not exists / create or replace）。
-- dev 專案若沒有 looker_ro 角色，授權段會自動略過。

create schema if not exists ops;

-- 1. 事件表
create table if not exists public.engagement_events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  event text not null
    check (event in ('open', 'browse', 'detail_view', 'search', 'add_collection', 'share')),
  platform text not null
    check (platform in ('ios', 'android', 'web')),
  user_id uuid null references auth.users(id) on delete cascade,
  visitor_id uuid null,
  is_suspected_bot boolean not null default false,
  bot_reason text null
    check (bot_reason is null or bot_reason in ('user_agent', 'webdriver')),
  created_at timestamptz not null default now(),
  constraint engagement_events_one_subject check (num_nonnulls(user_id, visitor_id) = 1)
);

-- 去重：同一主體、同一事件、同一平台、同一天只存一列（後端撞到 23505 視為成功）
create unique index if not exists engagement_events_dedupe
  on public.engagement_events (coalesce(user_id, visitor_id), event, platform, day);

-- 帳號刪除 cascade 時用得到
create index if not exists engagement_events_user_id_idx
  on public.engagement_events (user_id) where user_id is not null;

alter table public.engagement_events enable row level security;
revoke all on public.engagement_events from anon, authenticated;

-- 2. 每日各平台、各事件的不重複主體數（含疑似爬蟲，以 is_suspected_bot 區分）
create or replace view ops.v_engagement_daily as
select
  day,
  platform,
  event,
  is_suspected_bot,
  count(distinct coalesce(user_id, visitor_id)) as subjects
from public.engagement_events
group by day, platform, event, is_suspected_bot;

-- 3. 每週各平台 engagement rate（只算帳號）
create or replace view ops.v_engagement_rate_weekly as
with real_events as (
  select
    date_trunc('week', day)::date as week,
    platform,
    event,
    user_id as subject
  from public.engagement_events
  where user_id is not null  -- 只算帳號，訪客代號可偽造
),
openers as (
  select distinct week, platform, subject
  from real_events
  where event = 'open'
),
open_counts as (
  select week, platform, count(*) as open_subjects
  from openers
  group by week, platform
),
event_counts as (
  select e.week, e.platform, e.event, count(distinct e.subject) as subjects
  from real_events e
  join openers o
    on o.week = e.week and o.platform = e.platform and o.subject = e.subject
  group by e.week, e.platform, e.event
)
select
  ec.week,
  ec.platform,
  ec.event,
  ec.subjects,
  oc.open_subjects,
  round(ec.subjects::numeric / nullif(oc.open_subjects, 0), 4) as rate
from event_counts ec
join open_counts oc
  on oc.week = ec.week and oc.platform = ec.platform;

-- 4. 真實用戶（寬鬆版）：期間內有任何事件（含只有 open）的帳號，或新增過收藏的帳號。
--    只算帳號（user_id）：未登入的訪客代號與爬蟲旗標都由前端自報、可偽造，不納入。
create or replace view ops.v_real_users as
with subjects_7d as (
  select user_id as subject
  from public.engagement_events
  where user_id is not null and created_at >= now() - interval '7 days'
  union
  select user_id from public.collections
  where created_at >= now() - interval '7 days'
),
subjects_30d as (
  select user_id as subject
  from public.engagement_events
  where user_id is not null and created_at >= now() - interval '30 days'
  union
  select user_id from public.collections
  where created_at >= now() - interval '30 days'
)
select
  (select count(*) from subjects_7d)  as real_users_7d,
  (select count(*) from subjects_30d) as real_users_30d;

-- 5. 權限：與 004／005 相同，只給 looker_ro SELECT（dev 專案沒有這個角色時略過）
revoke all on ops.v_engagement_daily, ops.v_engagement_rate_weekly, ops.v_real_users
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'looker_ro') then
    grant usage on schema ops to looker_ro;
    grant select on ops.v_engagement_daily, ops.v_engagement_rate_weekly, ops.v_real_users
      to looker_ro;
  end if;
end
$$;

-- 驗證（執行後手動逐段確認）
--
-- a. 表與 view 都存在（應回 4 列）
-- select table_schema, table_name from information_schema.tables
-- where (table_schema, table_name) in (('public','engagement_events'),('ops','v_engagement_daily'),
--   ('ops','v_engagement_rate_weekly'),('ops','v_real_users'));
--
-- b. 去重生效：第二次 insert 應報 duplicate key（23505），最後 delete 清掉測試列
--    （第二次 insert 與 delete 請分開執行）
-- insert into public.engagement_events (day, event, platform, visitor_id, is_suspected_bot, bot_reason)
-- values (current_date, 'open', 'web', '00000000-0000-0000-0000-000000000001', true, 'user_agent');
-- insert into public.engagement_events (day, event, platform, visitor_id, is_suspected_bot, bot_reason)
-- values (current_date, 'open', 'web', '00000000-0000-0000-0000-000000000001', true, 'user_agent');
-- delete from public.engagement_events where visitor_id = '00000000-0000-0000-0000-000000000001';
--
-- c. 報表可查（剛上線應為 0 或只有收藏帶來的人數）
-- select * from ops.v_real_users;
-- select * from ops.v_engagement_daily order by day desc limit 20;
--
-- d. 唯讀角色只能讀 view、不能讀事件表（prod 才有 looker_ro）。SQL Editor 的 postgres 可能無法 set role，改用權限查詢：
-- select
--   has_table_privilege('looker_ro', 'public.engagement_events', 'select') as can_read_table,      -- 應為 false
--   has_table_privilege('looker_ro', 'ops.v_engagement_daily', 'select') as can_read_daily,        -- 應為 true
--   has_table_privilege('looker_ro', 'ops.v_engagement_rate_weekly', 'select') as can_read_weekly, -- 應為 true
--   has_table_privilege('looker_ro', 'ops.v_real_users', 'select') as can_read_real_users;         -- 應為 true
