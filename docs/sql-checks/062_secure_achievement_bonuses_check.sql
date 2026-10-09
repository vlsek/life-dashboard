-- Проверка ПОСЛЕ применения migrations/062_secure_achievement_bonuses.sql (BACKLOG 47.6, срез 3). Выполнять в Supabase SQL Editor (только чтение).

-- 1) Каталог на месте: ожидается 16 строк, сумма 560 (8 значков по 20 и 8 по 50 — как монетные ступени реестра на день применения).
select count(*) as badges, sum(coins) as total_coins from achievement_bonus_catalog;

-- 2) Функция на месте: ожидается 1 строка.
select proname from pg_proc where proname = 'claim_achievement_bonuses';

-- 3) Клиенту закрыта прямая запись в achievement_bonuses: ожидается insert=false, update=false, delete=false, select=true.
select has_table_privilege('authenticated', 'achievement_bonuses', 'insert') as insert,
       has_table_privilege('authenticated', 'achievement_bonuses', 'update') as upd,
       has_table_privilege('authenticated', 'achievement_bonuses', 'delete') as del,
       has_table_privilege('authenticated', 'achievement_bonuses', 'select') as sel;

-- 4) Каталог клиент не меняет: ожидается insert=false, update=false, select=true.
select has_table_privilege('authenticated', 'achievement_bonus_catalog', 'insert') as insert,
       has_table_privilege('authenticated', 'achievement_bonus_catalog', 'update') as upd,
       has_table_privilege('authenticated', 'achievement_bonus_catalog', 'select') as sel;

-- 5) Анонимам функция недоступна: ожидается false; вошедшим — true.
select has_function_privilege('anon', 'claim_achievement_bonuses()', 'execute') as anon_can,
       has_function_privilege('authenticated', 'claim_achievement_bonuses()', 'execute') as authed_can;

-- 6) Ранее выданные бонусы целы и не превышают каталог: ожидается over_catalog = 0 и unknown_keys = 0.
select count(*) filter (where b.coins > c.coins) as over_catalog,
       count(*) filter (where c.key is null) as unknown_keys
from achievement_bonuses b left join achievement_bonus_catalog c on c.key = b.key;
-- Если unknown_keys > 0 — это строки, вставленные клиентом ДО 062 (значки с монетами в реестре сверяются стражем, но подделка до миграции возможна);
-- разбор — docs/SECURITY_AUDIT_47_6.md, находка №2: `select user_id, key, coins from achievement_bonuses where key not in (select key from achievement_bonus_catalog)`.

-- 7) Глазами: открыть «Достижения» — страница грузится без ошибки, монеты за открытые значки уже в балансе (повторная загрузка баланс не меняет).
