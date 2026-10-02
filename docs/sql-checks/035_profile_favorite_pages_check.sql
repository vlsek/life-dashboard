-- Проверка 035_profile_favorite_pages.sql (Supabase SQL Editor).
-- 1) Колонка на месте (ожидается одна строка: favorite_pages | jsonb):
select column_name, data_type from information_schema.columns where table_name = 'profiles' and column_name = 'favorite_pages';
-- 2) Что сохранилось у пользователей (подставь свой user_id; ожидание после нажатия сердечек — массив ключей, например ["goals","shop"]):
-- select favorite_pages from profiles where user_id = '<твой user_id>';
