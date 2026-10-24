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

-- Looker Studio 每個資料來源與圖表都可能各開一條連線；上限 5 時第 6 條起被拒（too many connections for role）
alter role looker_ro connection limit 15;
alter role looker_ro set statement_timeout = '30s';

-- 權限：只對 ops views 有 SELECT；anon / authenticated 一律沒有
revoke all on schema ops from public, anon, authenticated;
revoke all on all tables in schema ops from public, anon, authenticated;
grant usage on schema ops to looker_ro;
grant select on all tables in schema ops to looker_ro;

-- 驗證（執行後手動確認）
-- SELECT count(*) FROM ops.v_signups_daily;
-- SELECT sum(total_signups) FROM ops.v_signups_daily;  -- 應等於 SELECT count(*) FROM auth.users;
