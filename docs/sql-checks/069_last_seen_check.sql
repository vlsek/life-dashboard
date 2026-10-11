-- Проверка миграции 069 (только чтение): «был в сети» у друзей (BACKLOG 48.2).
select count(*) as columns_ok from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name in ('last_seen_at', 'show_online'); -- ожидается 2
select count(*) as functions_ok from pg_proc
where proname in ('touch_last_seen', 'get_friends_presence') and pronamespace = 'public'::regnamespace; -- ожидается 2
select has_function_privilege('anon', 'public.touch_last_seen()', 'execute') as anon_touch,
       has_function_privilege('anon', 'public.get_friends_presence()', 'execute') as anon_presence,
       has_function_privilege('authenticated', 'public.touch_last_seen()', 'execute') as auth_touch,
       has_function_privilege('authenticated', 'public.get_friends_presence()', 'execute') as auth_presence; -- ожидается false, false, true, true
select count(*) as show_online_null from profiles where show_online is null; -- ожидается 0 (колонка not null default true)
select count(*) filter (where show_online) as show_online_on, count(*) filter (where not show_online) as show_online_off,
       count(*) filter (where last_seen_at is not null) as with_last_seen from profiles; -- информативно: сколько людей уже отметились
