-- Проверка migrations/039_profile_workout_program.sql (Supabase -> SQL Editor). Только чтение. Запускать ПОСЛЕ применения миграции.

-- 1) Колонка создана: должна вернуться 1 строка (data_type = jsonb).
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'workout_program';

-- 2) После того как на сайте нажали «Начать программу» — у вас в профиле появится объект с templateId/startDate/doneWeeks.
select user_id, workout_program from profiles where workout_program is not null limit 5;
