-- Проверка migrations/039_user_achievements.sql (Supabase -> SQL Editor). Только чтение: ничего не меняет.

-- 1) Таблица создана: должна вернуться 1 строка.
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'user_achievements';

-- 2) Колонки: user_id, key, unlocked_at (может быть пустой), created_at.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'user_achievements'
order by ordinal_position;

-- 3) Защита по строкам включена (rowsecurity = true) и есть политика «own user_achievements».
select c.relrowsecurity as rowsecurity,
       (select count(*) from pg_policies p where p.tablename = 'user_achievements' and p.policyname = 'own user_achievements') as own_policy
from pg_class c
where c.relname = 'user_achievements' and c.relnamespace = 'public'::regnamespace;

-- 4) Что уже записано (после первого захода на страницу «Достижения»): у каждого пользователя будет служебная строка
--    _baseline; unlocked_at пусто у достижений, выполненных до появления раздела.
select key, unlocked_at
from user_achievements
where user_id = auth.uid()
order by unlocked_at nulls first, key;
