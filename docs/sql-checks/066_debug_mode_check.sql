-- Проверка миграции 066 (только чтение): режим отладки администратора.
select count(*) as debug_column from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'debug_mode'; -- ожидается 1
select count(*) as set_debug_mode_fn from pg_proc
where proname = 'set_debug_mode' and pronamespace = 'public'::regnamespace; -- ожидается 1
select has_function_privilege('anon', 'public.set_debug_mode(boolean)', 'execute') as anon_can_call,
       has_function_privilege('authenticated', 'public.set_debug_mode(boolean)', 'execute') as authenticated_can_call; -- ожидается false, true
select count(*) as guard_trigger from pg_trigger
where tgname = 'protect_profile_admin_flag' and tgrelid = 'public.profiles'::regclass and not tgisinternal; -- ожидается 1
select (pg_get_functiondef('public.protect_profile_admin_flag()'::regprocedure) like '%debug_mode%') as guard_knows_debug; -- ожидается true (охрана обновлена)
select count(*) as debug_without_admin from profiles where debug_mode and not coalesce(is_admin, false); -- ожидается 0
select user_id, display_name, is_admin, debug_mode from profiles where is_admin order by display_name; -- администраторы и их режим (информативно)
