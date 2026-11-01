-- Migration 008: 訪客事件的索引與定期清理（pg_cron）
-- 相關：後端 VISITOR_DAILY_CAP（server/app/services/event_service.py）、docs/BACKLOG.md「訪客事件總量上限／舊列清理」
--
-- 背景：未登入的 open 事件只帶前端自報的訪客代號，可被偽造灌列（報表已只算帳號，剩儲存成長風險）。
-- 後端已加每日總量上限（5000 列／UTC 日）；本檔補兩件事：
--   1. 部分索引：後端每日上限要數「今天沒有帳號的列」，清理要找「太舊的訪客列」，兩者都走 day。
--   2. 每天用 pg_cron 刪除超過 365 天、只有訪客代號（user_id 為空）的事件。
--
-- 規則：
-- * 只刪 user_id is null 的列；有帳號的事件（engagement rate 的資料）永遠不動。
-- * 保留 365 天，與「疑似爬蟲來訪」報表的最長觀察區間一致。
-- * 排程每天 03:15 UTC 執行，job 名稱固定，重複執行本檔只會更新同一個 job。
--
-- 執行方式：在 Supabase Dashboard > SQL Editor 貼上整份執行（先 dev 再 prod）。
-- 冪等：可重複執行（if not exists；cron.schedule 同名 job 會被取代）。
-- 需求：專案要能啟用 pg_cron（Free Tier 可用）。若下面 create extension 失敗，
--       先到 Dashboard > Database > Extensions 手動啟用 pg_cron 再重跑。

create index if not exists engagement_events_visitor_day_idx
  on public.engagement_events (day)
  where user_id is null;

create extension if not exists pg_cron;

select cron.schedule(
  'engagement-visitor-retention',
  '15 3 * * *',
  $$delete from public.engagement_events
    where user_id is null
      and day < (now() at time zone 'utc')::date - 365$$
);

-- 驗證（執行後可另外貼上確認）：
-- select jobname, schedule, active from cron.job where jobname = 'engagement-visitor-retention';
-- 最近幾次執行結果：
-- select status, return_message, start_time from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'engagement-visitor-retention')
--   order by start_time desc limit 5;
