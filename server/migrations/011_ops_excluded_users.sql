-- Migration 011: 營運報表排除清單（排除站長自己、Apple 審核、測試帳號）
-- 文件: docs/OPS_DASHBOARD.md「排除清單」
--
-- 背景：啟用率、轉換率、活躍人數、留存的分母都含站長自己與 App Review 的測試帳號，數字會失真。
-- 做法：新增 ops.excluded_users（要排除的 user_id），並讓所有「算用戶」的 view 都排除這些帳號。
-- 資料本身不刪、不改：只影響 ops 報表，App 與 public 資料表完全不受影響。
--
-- 不排除的 view：ops.v_ai_usage_daily。ai_api_usage 沒有 user_id，而且 AI 呼叫是實際花掉的費用，
-- 內部測試的呼叫也算成本，所以維持原樣。
-- 訪客（visitor_id）本來就不在 v_engagement_rate_weekly／v_real_users 裡（只算帳號）；
-- v_engagement_daily 的訪客列沒有 user_id，無法以帳號排除，維持原樣。
--
-- 執行方式：先在 Supabase **dev** 專案 SQL Editor 貼上整份執行並跑驗證查詢，確認後再執行於 prod。
-- 冪等：可重複執行（if not exists／create or replace）。每個 view 的欄位名稱、順序、型別都與原版相同。
-- 清單是空的時候，所有 view 的輸出與執行前完全一致。

begin;

create schema if not exists ops;

-- 1. 排除清單
create table if not exists ops.excluded_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null check (reason in ('owner', 'app_review', 'tester', 'other')),
  note text null,
  created_at timestamptz not null default now()
);

alter table ops.excluded_users enable row level security;
revoke all on ops.excluded_users from public, anon, authenticated;
-- 刻意不給 looker_ro：views 以擁有者權限執行，Looker 不需要、也不該讀到清單內容。

-- 2. 每日新註冊
create or replace view ops.v_signups_daily as
select
  (created_at at time zone 'UTC')::date as day,
  count(*) filter (where is_anonymous) as anonymous_signups,
  count(*) filter (where not is_anonymous) as registered_signups,
  count(*) as total_signups
from auth.users u
where not exists (select 1 from ops.excluded_users x where x.user_id = u.id)
group by 1;

-- 3. 啟用率
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
where not exists (select 1 from ops.excluded_users x where x.user_id = u.id)
group by 1, 4;

-- 4. 留存代理
create or replace view ops.v_retention_proxy as
with cohort as (
  select u.id, date_trunc('week', u.created_at at time zone 'UTC')::date as cohort_week
  from auth.users u
  where not exists (select 1 from ops.excluded_users x where x.user_id = u.id)
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

-- 5. 每日收藏
create or replace view ops.v_collections_daily as
select
  (created_at at time zone 'UTC')::date as day,
  media_type,
  count(*) as items,
  count(*) filter (where notes is not null and btrim(notes) <> '') as with_reflection,
  count(*) filter (where rating is not null and rating > 0) as with_rating,
  count(*) filter (where seasons is not null and cardinality(seasons) > 0) as with_seasons
from public.collections c
where not exists (select 1 from ops.excluded_users x where x.user_id = c.user_id)
group by 1, 2;

-- 6. 近 7／30 天活躍總覽
create or replace view ops.v_activity_summary as
select
  (select count(distinct s.user_id) from auth.sessions s
    where coalesce(s.updated_at, s.created_at) >= now() - interval '7 days'
      and not exists (select 1 from ops.excluded_users x where x.user_id = s.user_id))  as online_users_7d,
  (select count(distinct s.user_id) from auth.sessions s
    where coalesce(s.updated_at, s.created_at) >= now() - interval '30 days'
      and not exists (select 1 from ops.excluded_users x where x.user_id = s.user_id)) as online_users_30d,
  (select count(distinct c.user_id) from public.collections c
    where c.created_at >= now() - interval '7 days'
      and not exists (select 1 from ops.excluded_users x where x.user_id = c.user_id))  as collecting_users_7d,
  (select count(distinct c.user_id) from public.collections c
    where c.created_at >= now() - interval '30 days'
      and not exists (select 1 from ops.excluded_users x where x.user_id = c.user_id)) as collecting_users_30d,
  (select count(*) from auth.users u
    where u.created_at >= now() - interval '7 days'
      and not exists (select 1 from ops.excluded_users x where x.user_id = u.id))       as new_signups_7d,
  (select count(*) from auth.users u
    where u.created_at >= now() - interval '30 days'
      and not exists (select 1 from ops.excluded_users x where x.user_id = u.id))       as new_signups_30d,
  (select count(*) from auth.users u
    where not exists (select 1 from ops.excluded_users x where x.user_id = u.id))       as total_users;

-- 7. 每日活躍趨勢
create or replace view ops.v_active_daily as
with online as (
  select (coalesce(s.updated_at, s.created_at) at time zone 'UTC')::date as day,
         count(distinct s.user_id) as online_users
  from auth.sessions s
  where not exists (select 1 from ops.excluded_users x where x.user_id = s.user_id)
  group by 1
),
collecting as (
  select (c.created_at at time zone 'UTC')::date as day,
         count(distinct c.user_id) as collecting_users
  from public.collections c
  where not exists (select 1 from ops.excluded_users x where x.user_id = c.user_id)
  group by 1
)
select
  coalesce(o.day, c.day) as day,
  coalesce(o.online_users, 0) as online_users,
  coalesce(c.collecting_users, 0) as collecting_users
from online o
full join collecting c on c.day = o.day;

-- 8. 互動：每日各平台、各事件的不重複主體數（訪客列沒有 user_id，不受影響）
create or replace view ops.v_engagement_daily as
select
  day,
  platform,
  event,
  is_suspected_bot,
  count(distinct coalesce(user_id, visitor_id)) as subjects
from public.engagement_events e
where e.user_id is null
   or not exists (select 1 from ops.excluded_users x where x.user_id = e.user_id)
group by day, platform, event, is_suspected_bot;

-- 9. 互動：每週各平台 engagement rate（只算帳號）
create or replace view ops.v_engagement_rate_weekly as
with real_events as (
  select
    date_trunc('week', e.day)::date as week,
    e.platform,
    e.event,
    e.user_id as subject
  from public.engagement_events e
  where e.user_id is not null  -- 只算帳號，訪客代號可偽造
    and not exists (select 1 from ops.excluded_users x where x.user_id = e.user_id)
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

-- 10. 真實用戶（寬鬆版）
create or replace view ops.v_real_users as
with subjects_7d as (
  select e.user_id as subject
  from public.engagement_events e
  where e.user_id is not null and e.created_at >= now() - interval '7 days'
    and not exists (select 1 from ops.excluded_users x where x.user_id = e.user_id)
  union
  select c.user_id from public.collections c
  where c.created_at >= now() - interval '7 days'
    and not exists (select 1 from ops.excluded_users x where x.user_id = c.user_id)
),
subjects_30d as (
  select e.user_id as subject
  from public.engagement_events e
  where e.user_id is not null and e.created_at >= now() - interval '30 days'
    and not exists (select 1 from ops.excluded_users x where x.user_id = e.user_id)
  union
  select c.user_id from public.collections c
  where c.created_at >= now() - interval '30 days'
    and not exists (select 1 from ops.excluded_users x where x.user_id = c.user_id)
)
select
  (select count(*) from subjects_7d)  as real_users_7d,
  (select count(*) from subjects_30d) as real_users_30d;

-- 11. 權限：與 004／005／006 相同，anon／authenticated 一律沒有（dev 沒跑過 004／005，這裡會新建那些 view，所以明確收回；
--     prod 上 create or replace 本來就保留既有權限，這行只是重複確認）。looker_ro 的 SELECT 不在這裡動。
revoke all on
  ops.v_signups_daily, ops.v_activation, ops.v_retention_proxy, ops.v_collections_daily,
  ops.v_activity_summary, ops.v_active_daily,
  ops.v_engagement_daily, ops.v_engagement_rate_weekly, ops.v_real_users
  from public, anon, authenticated;

commit;

-- 加入排除（範例；user_id 先用 auth.users 查出來，不要把 email 寫進這個檔案）
-- insert into ops.excluded_users (user_id, reason, note)
--   select id, 'owner', '站長自己的帳號' from auth.users where id in ('<user_id>', '<user_id>')
--   on conflict (user_id) do nothing;
-- 移除排除：delete from ops.excluded_users where user_id = '<user_id>';
-- 查看目前清單：select user_id, reason, note, created_at from ops.excluded_users order by created_at;

-- 驗證（執行後手動確認；清單為空時，每個 view 的輸出應與執行前相同）
-- 1) 表存在且 anon／authenticated 讀不到：
-- select has_table_privilege('anon', 'ops.excluded_users', 'select') as anon_can_read;  -- 應為 false
-- 2) 清單為空時總數不變：
-- select total_users from ops.v_activity_summary;  -- 應等於 select count(*) from auth.users;
-- 3) 加入 1 個帳號後 total_users 應減 1，該帳號的收藏不再出現在 v_collections_daily 的計數。
