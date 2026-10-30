-- Проверка миграции 113 (read-only): таблицы, колонки и политики «Тренировки v2» на месте.
select table_name from information_schema.tables where table_schema = 'public' and table_name in ('workout_sessions', 'workout_routines', 'workout_routine_items') order by 1;
select table_name, column_name from information_schema.columns where table_schema = 'public'
  and ((table_name = 'workout_entries' and column_name in ('session_id', 'position', 'superset_group')) or (table_name = 'profiles' and column_name = 'workout_settings')) order by 1, 2;
select tablename, policyname from pg_policies where tablename in ('workout_sessions', 'workout_routines', 'workout_routine_items') order by 1;
select indexname from pg_indexes where indexname = 'workout_sessions_one_active_idx';
-- Ожидается: 3 таблицы, 4 колонки, 3 политики, 1 индекс. Идущих сессий у пользователя не больше одной:
select user_id, count(*) from workout_sessions where finished_at is null group by 1 having count(*) > 1;
