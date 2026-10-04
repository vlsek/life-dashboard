-- Проверка миграции 048 (только чтение).
-- 1) таблица и RLS (ожидается: rowsecurity = true)
select tablename, rowsecurity from pg_tables where tablename = 'user_customizations';
-- 2) политика «только своё» (ожидается 1 строка)
select policyname from pg_policies where tablename = 'user_customizations';
-- 3) колонка выбранного (ожидается jsonb, default '{}')
select column_name, data_type, column_default from information_schema.columns where table_name = 'profiles' and column_name = 'customization';
-- 4) у существующих профилей выбор пуст, а не NULL (ожидается 0)
select count(*) as null_customization from profiles where customization is null;
