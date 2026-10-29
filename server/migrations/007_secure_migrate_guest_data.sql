-- Migration 007: 補上 migrate_guest_data 的權限檢查
-- 相關：openspec/changes/add-engagement-events/、docs/superpowers/plans/2026-10-29-engagement-events.md（Task 9）
--
-- 背景：訪客（匿名帳號）登入 Apple／Google／Email 後，前端（client/src/hooks/useAuth.ts）以「新登入的帳號」
-- 身分呼叫 rpc('migrate_guest_data', { old_user_id: 訪客帳號, new_user_id: 新帳號 })，把訪客的收藏搬過去。
-- 原本的函式只存在線上（舊版定義見 server/migration_sprint_4.py），且有三個問題：
--   1. SECURITY DEFINER（以擁有者權限執行、繞過 RLS），EXECUTE 卻開放給 PUBLIC（含 anon）；
--   2. 不檢查呼叫者：任何持有公開 anon key 的人，只要知道 UUID，就能把任何人的收藏搬到任何帳號；
--   3. 沒有固定 search_path。
-- 本檔保留原本的搬移邏輯（先刪掉訪客與新帳號重複的作品，再把其餘收藏改到新帳號），只加上檢查與權限。
--
-- 規則：
-- * 呼叫者必須已登入，且 new_user_id 必須是呼叫者自己（auth.uid()）。
-- * old_user_id 必須是匿名帳號（不能搬走正式帳號的資料）。
-- * old_user_id = new_user_id 時不做任何事。
-- * 違反規則時丟出 42501（insufficient_privilege），前端會記 log 並保留 storio_guest_id，不影響登入。
-- * 已知取捨：函式無法證明呼叫者「擁有」那個匿名帳號，所以任何已登入的 session 若知道某個匿名帳號的
--   UUID，仍可把它的收藏搬到自己名下。UUID 為隨機 v4，前端網址與分享內容都不含 user id，實際風險低。
-- * service_role 保留 EXECUTE 但沒有 auth.uid()，呼叫一律被拒（後端沒有呼叫這個函式）。
--
-- 執行方式：在 Supabase Dashboard > SQL Editor 貼上整份執行（先 dev 再 prod）。
-- 冪等：可重複執行（create or replace；revoke／grant 可重複）。
-- 對現有 App 的影響：正常流程本來就是新帳號替自己搬，不受影響。

create or replace function public.migrate_guest_data(old_user_id uuid, new_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or new_user_id is distinct from auth.uid() then
    raise exception 'migrate_guest_data: destination must be the signed-in user'
      using errcode = '42501';
  end if;

  if old_user_id is null or old_user_id = new_user_id then
    return;
  end if;

  if not exists (
    select 1 from auth.users where id = old_user_id and is_anonymous
  ) then
    raise exception 'migrate_guest_data: source must be an anonymous account'
      using errcode = '42501';
  end if;

  delete from public.collections
  where user_id = old_user_id
    and (external_id, media_type) in (
      select external_id, media_type
      from public.collections
      where user_id = new_user_id
    );

  update public.collections
  set user_id = new_user_id
  where user_id = old_user_id;
end;
$$;

-- 權限：只給已登入的角色（含匿名登入後的 session）；anon（未登入）與 PUBLIC 不可呼叫
revoke all on function public.migrate_guest_data(uuid, uuid) from public, anon;
grant execute on function public.migrate_guest_data(uuid, uuid) to authenticated;

-- 驗證（執行後手動逐段確認）
--
-- a. 函式設定：prosecdef = true、proconfig 含 search_path=public, pg_temp、proacl 不含 anon 與 PUBLIC（=X）
-- select prosecdef, proconfig, proacl::text from pg_proc
-- where proname = 'migrate_guest_data' and pronamespace = 'public'::regnamespace;
--
-- b. 權限：anon 應為 false、authenticated 應為 true
-- select
--   has_function_privilege('anon', 'public.migrate_guest_data(uuid, uuid)', 'execute') as anon_can_execute,
--   has_function_privilege('authenticated', 'public.migrate_guest_data(uuid, uuid)', 'execute') as authenticated_can_execute;
--
-- c. SQL Editor 以 postgres 執行時沒有 auth.uid()，呼叫應被拒（42501 destination must be the signed-in user）
-- select public.migrate_guest_data(gen_random_uuid(), gen_random_uuid());
