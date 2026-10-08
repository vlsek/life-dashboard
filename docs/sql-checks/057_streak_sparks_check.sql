-- Проверка миграции 057 (только чтение).
-- 1) таблицы, колонки и функции существуют
select to_regclass('streak_sparks') is not null as ledger_exists, to_regclass('sparks_config') is not null as config_exists;
select column_name from information_schema.columns where table_name = 'shop_items' and column_name in ('cost_sparks', 'archived') order by 1;
select proname from pg_proc where proname in ('sync_streak_sparks', 'get_sparks_balance', 'backfill_streak_sparks', 'streak_metric_done', 'sparks_balance_of', 'shop_items_sparks_guard') order by 1;
-- 2) настройки экономики (ожидается: daily_cap, rub_per_spark, start_date)
select key, num, day from sparks_config order by key;
-- 3) старые невыкупленные вещи в монетах заархивированы (ожидается 0)
select count(*) as not_archived from shop_items where coalesce(redeemed, false) = false and cost_sparks is null and archived = false;
-- 4) у вещей за огоньки cost = 0 (ожидается 0)
select count(*) as sparks_with_coin_cost from shop_items where cost_sparks is not null and cost <> 0;
-- 5) ни у кого баланс огоньков не отрицательный (ожидается 0)
select count(*) as negative_balance from (select user_id from profiles where sparks_balance_of(user_id) < 0) x;
