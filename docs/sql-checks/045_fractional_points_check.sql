-- Проверка после применения migrations/045_fractional_points.sql (Supabase -> SQL Editor). Только чтение, данные не меняются.
-- 1) Баллы стали numeric (ожидается: у всех пяти функций тип numeric / в таблице результата — numeric):
select p.proname, pg_get_function_result(p.oid) as returns
from pg_proc p
where p.proname in ('calc_user_points', 'calc_user_points_for_date', 'get_leaderboard', 'get_today_activity', 'get_category_leaderboard')
  and p.pronamespace = 'public'::regnamespace
order by p.proname;

-- 2) Правило на искусственных данных (журнал: с 1 октября 4 подхода, флаг frac). Во всех строках ожидается ok = true:
select * from (values
  ('1 подход из 4 = 0,3 (0,25 округляется вверх)',  metric_partial_points('sets', '[{"from":"2026-10-01","n":4,"frac":true}]'::jsonb, '[{"reps":10}]'::jsonb, '2026-10-05') = 0.3),
  ('2 подхода из 4 = 0,5',                          metric_partial_points('sets', '[{"from":"2026-10-01","n":4,"frac":true}]'::jsonb, '[{"reps":10},{"reps":10}]'::jsonb, '2026-10-05') = 0.5),
  ('3 подхода из 4 = 0,8',                          metric_partial_points('sets', '[{"from":"2026-10-01","n":4,"frac":true}]'::jsonb, '[{"reps":10},{"reps":10},{"reps":10}]'::jsonb, '2026-10-05') = 0.8),
  ('запись без frac — дробных баллов нет',          metric_partial_points('sets', '[{"from":"2026-10-01","n":4}]'::jsonb, '[{"reps":10}]'::jsonb, '2026-10-05') = 0),
  ('день до записи журнала — дробных баллов нет',   metric_partial_points('sets', '[{"from":"2026-10-10","n":4,"frac":true}]'::jsonb, '[{"reps":10}]'::jsonb, '2026-10-05') = 0),
  ('не подходы — дробных баллов нет',               metric_partial_points('number', '[{"from":"2026-10-01","n":4,"frac":true}]'::jsonb, '3'::jsonb, '2026-10-05') = 0),
  ('потолок 0,9 (19 подходов из 20)',               metric_partial_points('sets', '[{"from":"2026-10-01","n":20,"frac":true}]'::jsonb, (select jsonb_agg(jsonb_build_object('reps', 1)) from generate_series(1, 19)), '2026-10-05') = 0.9)
) as t(check_name, ok);

-- 3) Лидерборд и «активность сегодня» вызываются без ошибок и отдают числа (в колонках total_points / today_points допустимы дроби):
select user_id, total_points from get_leaderboard() order by total_points desc limit 3;

-- 4) Информационно: у скольких метрик уже есть запись с дробными баллами (пока параметр никому не задавали с новой формы — 0):
select count(*) as metrics_with_fractional_plan from metrics
where planned_sets_log is not null and planned_sets_log::text like '%"frac": true%';
