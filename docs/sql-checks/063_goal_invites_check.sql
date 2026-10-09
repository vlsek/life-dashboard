-- Проверка ПОСЛЕ применения migrations/063_goal_invites.sql (BACKLOG 41, цели и задачи друзьям). Supabase SQL Editor, только чтение.

-- 1) Таблица, колонка лимита и 5 функций на месте: ожидается table=1, limit_col=1, functions=5.
select (select count(*) from information_schema.tables where table_name = 'goal_invites') as "table",
       (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'goal_invites_per_day') as limit_col,
       (select count(*) from pg_proc where proname in ('send_goal_invite','respond_goal_invite','cancel_goal_invite','get_goal_invites','mark_goal_invite_seen')) as functions;

-- 2) Прямая запись клиенту закрыта: ожидается ins=false, upd=false, del=false, sel=true.
select has_table_privilege('authenticated', 'goal_invites', 'insert') as ins,
       has_table_privilege('authenticated', 'goal_invites', 'update') as upd,
       has_table_privilege('authenticated', 'goal_invites', 'delete') as del,
       has_table_privilege('authenticated', 'goal_invites', 'select') as sel;

-- 3) RLS включён и одна политика на чтение: ожидается rls=true, policies=1.
select (select relrowsecurity from pg_class where relname = 'goal_invites') as rls,
       (select count(*) from pg_policies where tablename = 'goal_invites') as policies;

-- 4) Три триггера: ожидается 3 строки (friendships, goals, daily_notes).
select event_object_table, trigger_name from information_schema.triggers
 where trigger_name in ('goal_invite_on_unfriend','goal_invite_on_goal_done','goal_invite_on_note_done') order by 1;

-- 5) Данных пока нет: ожидается 0.
select count(*) as invites from goal_invites;
