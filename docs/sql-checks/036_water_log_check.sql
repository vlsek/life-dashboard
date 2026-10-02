-- Проверка migrations/036_water_log.sql (Supabase -> SQL Editor). Только чтение: ничего не меняет. Запускать ПОСЛЕ применения миграции.

-- 1) Таблица создана: должна вернуться 1 строка.
select table_name from information_schema.tables where table_schema = 'public' and table_name = 'water_log';

-- 2) Колонки: id, user_id, date, drank_at, delta_ml, total_after_ml, kind, created_at (8 строк).
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'water_log'
order by ordinal_position;

-- 3) RLS включён (relrowsecurity = true) и есть политика «own water_log» (cmd = ALL).
select relrowsecurity from pg_class where relname = 'water_log';
select policyname, cmd from pg_policies where tablename = 'water_log';

-- 4) Ограничения: delta_ml <> 0 и kind in ('add','edit') — должно вернуться 2 строки.
select conname from pg_constraint where conrelid = 'public.water_log'::regclass and contype = 'c' order by conname;

-- 5) Индекс для выборки по дню (water_log_user_date_idx).
select indexname from pg_indexes where tablename = 'water_log';

-- 6) После первого добавления воды на сайте строки появляются; сумма журнала за день (sum_of_log) должна совпадать со значением дня (day_value).
--    Расхождение для дней ДО миграции нормально: воду тогда вносили без журнала, а журнал считает только новые записи.
select wl.date,
       sum(wl.delta_ml) as sum_of_log,
       max(dv.value)::numeric as day_value,
       count(*) as entries
from water_log wl
left join metrics m on m.user_id = wl.user_id and m.active = true and m.type = 'number' and is_water_like(m.icon, m.name)
left join daily_values dv on dv.metric_id = m.id and dv.date = wl.date
group by wl.date
order by wl.date desc
limit 10;
