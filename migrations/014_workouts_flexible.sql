-- 014_workouts_flexible.sql
--
-- Раздел "Тренировки" (013) изначально был заточен под reps × weight (жим, присед и т.п.).
-- Но многие упражнения без веса вообще: отжимания/подтягивания (просто повторения),
-- планка (время), бег (дистанция). Добавляем два поля на упражнение:
--   tracks_weight  — вести ли вообще вес у этого упражнения
--   value_label    — как называется основное число (по умолчанию "Повторения",
--                    можно поставить "Секунды", "Километры" и что угодно своё)
-- unit из 013 теперь используется гибко: единица веса, если tracks_weight = true.

alter table workout_exercises add column if not exists tracks_weight boolean default true;
alter table workout_exercises add column if not exists value_label text default 'Повторения';
