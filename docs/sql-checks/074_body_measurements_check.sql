-- Проверка миграции 074 (read-only): таблица, ограничения, политика.
select count(*) as table_exists from information_schema.tables where table_name = 'body_measurements';
select conname from pg_constraint where conrelid = 'body_measurements'::regclass order by 1;
select policyname, cmd from pg_policies where tablename = 'body_measurements';
select count(*) as rows_total from body_measurements;
