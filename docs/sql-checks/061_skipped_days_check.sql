-- Проверка миграции 061 (только чтение).
-- 1) колонка, триггер и функции существуют
select column_name, data_type from information_schema.columns where table_name = 'metrics' and column_name = 'skipped_days';
select tgname from pg_trigger where tgname = 'metrics_skipped_days_guard';
select proname from pg_proc where proname in ('metrics_skipped_days_guard', 'calc_perfect_streak', 'calc_category_streak') order by 1;
-- 2) функции серий знают про пропуск (ожидается 2 строки: обе содержат skipped_days)
select proname from pg_proc where proname in ('calc_perfect_streak', 'calc_category_streak') and prosrc like '%skipped_days%' order by 1;
-- 3) ни у кого пропуски не заходят в будущее дальше «сегодня» (ожидается 0)
select count(*) as future_skips from metrics m, unnest(m.skipped_days) d where d > user_today(m.user_id);
