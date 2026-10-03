-- Проверка 043_water_norm_food.sql (Supabase -> SQL Editor). Только чтение. Запускать ПОСЛЕ применения миграции.

-- 1) Обе функции на месте и недоступны клиентам (должно быть false/false/false в каждой строке):
select 'water_auto_norm_ml' as fn,
       has_function_privilege('anon', 'water_auto_norm_ml(uuid)', 'execute') as anon,
       has_function_privilege('authenticated', 'water_auto_norm_ml(uuid)', 'execute') as authenticated,
       has_function_privilege('public', 'water_auto_norm_ml(uuid)', 'execute') as public_role
union all
select 'metric_null_goal',
       has_function_privilege('anon', 'metric_null_goal(uuid, uuid, text, text, text)', 'execute'),
       has_function_privilege('authenticated', 'metric_null_goal(uuid, uuid, text, text, text)', 'execute'),
       has_function_privilege('public', 'metric_null_goal(uuid, uuid, text, text, text)', 'execute');

-- 2) В теле функций новые числа (должно вернуть true / true / true):
select position('1000 / 10' in pg_get_functiondef('water_auto_norm_ml(uuid)'::regprocedure)) > 0 as has_bsa_1000,
       position('w * 26' in pg_get_functiondef('water_auto_norm_ml(uuid)'::regprocedure)) > 0 as has_kg_26,
       position('1800' in pg_get_functiondef('metric_null_goal(uuid, uuid, text, text, text)'::regprocedure)) > 0 as has_default_1800;

-- 3) Формула на примерах (без обращения к таблицам): ожидание 1840 / 1680 / 1630 / 1820.
select round(sqrt(175 * 70 / 3600.0) * 1000 / 10) * 10 as h175_w70_expect_1840,
       round(sqrt(185 * 55 / 3600.0) * 1000 / 10) * 10 as h185_w55_expect_1680,
       round(sqrt(160 * 60 / 3600.0) * 1000 / 10) * 10 as h160_w60_expect_1630,
       round(70 * 26)                                  as w70_no_height_expect_1820;

-- 4) Твоя норма (подставь свой user_id): при росте 175 см и весе 70 кг → 1840; без роста → 1820; без веса → null (клиент покажет 1800).
-- select water_auto_norm_ml('<твой user_id>');
