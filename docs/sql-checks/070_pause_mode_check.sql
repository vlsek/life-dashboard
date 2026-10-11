-- Проверка миграции 070 (только чтение): режим «отпуск / болезнь».
select count(*) as table_streak_pauses from information_schema.tables
where table_schema = 'public' and table_name = 'streak_pauses'; -- ожидается 1
select count(*) as pause_fns from pg_proc
where proname in ('start_pause', 'end_pause', 'pause_add_dates', 'pause_remove_dates', 'metrics_apply_pause') and pronamespace = 'public'::regnamespace; -- ожидается 5
select has_function_privilege('anon', 'public.start_pause(text,date,date)', 'execute') as anon_can_start,
       has_function_privilege('authenticated', 'public.start_pause(text,date,date)', 'execute') as authenticated_can_start,
       has_function_privilege('authenticated', 'public.pause_add_dates(uuid,date,date,uuid)', 'execute') as authenticated_can_add_dates; -- ожидается false, true, false
select has_table_privilege('authenticated', 'public.streak_pauses', 'insert') as can_insert_directly; -- ожидается false (пишут только функции)
select count(*) as pause_trigger from pg_trigger
where tgname = 'metrics_pause_dates' and tgrelid = 'public.metrics'::regclass and not tgisinternal; -- ожидается 1
select (pg_get_functiondef('public.metrics_skipped_days_guard()'::regprocedure) like '%app.pause_write%') as guard_knows_pause; -- ожидается true
select count(*) as too_long from streak_pauses where to_date - from_date > 29; -- ожидается 0
select user_id, kind, from_date, to_date from streak_pauses where to_date >= current_date order by from_date; -- идущие и запланированные паузы (информативно)
