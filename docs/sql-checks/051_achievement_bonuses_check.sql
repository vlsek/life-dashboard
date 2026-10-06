-- Проверка после применения migrations/051_achievement_bonuses.sql (Supabase -> SQL Editor). Только чтение, данные не меняются.
-- 1) Таблица есть и защита строк включена (ожидается: table_exists = 1, rls_enabled = true):
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'achievement_bonuses') as table_exists,
       (select relrowsecurity from pg_class where oid = 'public.achievement_bonuses'::regclass) as rls_enabled;

-- 2) Политики: ровно две — читать свои (select) и добавлять свои (insert); политик на update/delete НЕТ:
select policyname, cmd from pg_policies where tablename = 'achievement_bonuses' order by cmd;

-- 3) Права для роли authenticated: только SELECT и INSERT (UPDATE и DELETE отсутствуют):
select privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'achievement_bonuses' and grantee = 'authenticated' order by privilege_type;

-- 4) Ограничения: один бонус на ключ значка (первичный ключ user_id + key) и размер награды 0,1…500:
select conname, pg_get_constraintdef(oid) as definition from pg_constraint
where conrelid = 'public.achievement_bonuses'::regclass order by contype, conname;

-- 5) Информационно: сколько бонусов выдано и на сколько монет (пока ни один значок не выдавал награду — 0 / null):
select count(*) as bonuses, sum(coins) as total_coins from achievement_bonuses;

-- 6) Бонус НЕ входит в лидерборд: у любого пользователя «накоплено» из лидерборда не зависит от выданных бонусов. Проверка на глаз после первой выдачи:
--    select user_id, total_points from get_leaderboard() order by total_points desc limit 5;  -- сравните с набранными баллами, бонус сюда не добавляется
