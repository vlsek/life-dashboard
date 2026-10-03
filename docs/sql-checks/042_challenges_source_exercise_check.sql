-- Проверка после применения migrations/042_challenges_source_exercise.sql (Supabase -> SQL Editor). Только чтение.
-- 1) Колонка появилась (должна вернуться одна строка: source_exercise_id / uuid):
select column_name, data_type from information_schema.columns where table_name = 'challenge_instances' and column_name = 'source_exercise_id';
-- 2) Внешний ключ ведёт на workout_exercises и обнуляется при удалении упражнения (confdeltype = 'n' — set null):
select conname, confdeltype from pg_constraint where conrelid = 'challenge_instances'::regclass and confrelid = 'workout_exercises'::regclass;
-- 3) Пока никто не привязал челлендж к упражнению — 0 (старое поведение не изменилось):
select count(*) as challenges_with_exercise_source from challenge_instances where source_exercise_id is not null;
-- 4) После выбора упражнения в форме челленджа — привязка видна:
select ci.title, we.name as exercise from challenge_instances ci join workout_exercises we on we.id = ci.source_exercise_id order by ci.created_at desc limit 10;
