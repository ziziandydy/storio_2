-- Migration 003: 新增 ai_api_usage 表（AI API 呼叫量/token 用量記錄）
--
-- 背景：目前完全沒有任何機制記錄 Gemini/OpenAI 被呼叫的頻率或成本，
-- 無法回答「AI API 花費是否過高」。這張表記錄每一次真正打出去的 AI API
-- 呼叫（不含快取命中），供之後用 SQL 直接統計呼叫量與 token 用量估算成本。
--
-- 執行方式：在 Supabase Dashboard > SQL Editor 執行（動 production schema）。
-- 冪等：可重複執行（IF NOT EXISTS）。
--
-- 範例查詢（統計各端點/provider 的呼叫量與 token 用量）：
-- SELECT endpoint, provider, count(*) AS calls, sum(total_tokens) AS tokens
-- FROM ai_api_usage
-- GROUP BY endpoint, provider
-- ORDER BY tokens DESC NULLS LAST;

create extension if not exists "uuid-ossp";

create table if not exists ai_api_usage (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  endpoint text not null,        -- 'reflection_suggestions' | 'reflection_refine' | 'search_intent' | 'daily_recommendations'
  provider text not null,        -- 'gemini' | 'openai'
  model text not null,           -- 'gemini-2.5-flash' | 'gpt-4o-mini'
  success boolean not null,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms integer,
  error text
);

-- 純 backend service-role 寫入，不開放任何 public 存取（比照 daily_recommendations 的安全模式）
alter table ai_api_usage enable row level security;

-- 驗證（執行後手動確認）
-- SELECT endpoint, provider, model, success, total_tokens, latency_ms, created_at
-- FROM ai_api_usage ORDER BY created_at DESC LIMIT 20;
