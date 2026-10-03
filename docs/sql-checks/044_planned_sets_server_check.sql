-- Проверка после применения migrations/044_planned_sets_server.sql (Supabase -> SQL Editor). Только чтение, данные не меняются.
-- 1) Обе вспомогательные функции и колонка на месте (ожидается: helpers = 2, column_exists = 1):
select (select count(*) from pg_proc where proname in ('planned_sets_on', 'planned_sets_ok')) as helpers,
       (select count(*) from information_schema.columns where table_name = 'metrics' and column_name = 'planned_sets_log') as column_exists;

-- 2) Правило на искусственных данных (журнал: с 1 октября 3 подхода, с 10 октября 4). Во всех строках ожидается ok = true:
select * from (values
  ('до первой записи журнала нет плана',        planned_sets_on('[{"from":"2026-10-01","n":3},{"from":"2026-10-10","n":4}]'::jsonb, '2026-09-30') is null),
  ('с 1 октября — 3',                           planned_sets_on('[{"from":"2026-10-01","n":3},{"from":"2026-10-10","n":4}]'::jsonb, '2026-10-09') = 3),
  ('с 10 октября — 4',                          planned_sets_on('[{"from":"2026-10-01","n":3},{"from":"2026-10-10","n":4}]'::jsonb, '2026-10-10') = 4),
  ('параметр снят (n = null) — плана нет',      planned_sets_on('[{"from":"2026-10-01","n":3},{"from":"2026-10-20","n":null}]'::jsonb, '2026-10-21') is null),
  ('мусор в журнале не ломает расчёт',          planned_sets_on('"oops"'::jsonb, '2026-10-05') is null),
  ('3 подхода при плане 3 — достаточно',        planned_sets_ok('sets', '[{"from":"2026-10-01","n":3}]'::jsonb, '[{"reps":5},{"reps":5},{"reps":5}]'::jsonb, '2026-10-05')),
  ('1 подход при плане 3 — мало',               not planned_sets_ok('sets', '[{"from":"2026-10-01","n":3}]'::jsonb, '[{"reps":50}]'::jsonb, '2026-10-05')),
  ('тот же 1 подход ДО даты плана — как раньше', planned_sets_ok('sets', '[{"from":"2026-10-06","n":3}]'::jsonb, '[{"reps":50}]'::jsonb, '2026-10-05')),
  ('не подходы — правило не действует',         planned_sets_ok('number', '[{"from":"2026-10-01","n":3}]'::jsonb, '7'::jsonb, '2026-10-05')),
  ('метрика без журнала — правило не действует', planned_sets_ok('sets', null, '[{"reps":1}]'::jsonb, '2026-10-05'))
) as t(check_name, ok);

-- 3) Пять функций по-прежнему вызываются вашим пользователем (подставьте свой user_id из таблицы profiles) — должны вернуться числа, без ошибок:
-- select calc_user_points('<ваш user_id>'), calc_perfect_streak('<ваш user_id>');

-- 4) Информационно: у скольких метрик задан план подходов (пока параметр никому не задан — 0):
select count(*) as metrics_with_plan from metrics where planned_sets_log is not null;
