-- Проверка после применения migrations/041_metric_planned_sets.sql (Supabase -> SQL Editor). Только чтение.
-- 1) Колонка появилась (должна вернуться одна строка: planned_sets_log / jsonb):
select column_name, data_type from information_schema.columns where table_name = 'metrics' and column_name = 'planned_sets_log';
-- 2) Пока никто не задавал плановое число подходов — все значения null (правило «выполнено» не изменилось ни для одной метрики):
select count(*) as metrics_with_plan from metrics where planned_sets_log is not null;
-- 3) После того как в форме метрики-подходов задали «Подходов в день по плану» — журнал выглядит как массив записей с датами:
select name, planned_sets_log from metrics where planned_sets_log is not null order by name limit 10;
