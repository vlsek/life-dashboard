-- Проверка 034_water_norm_height.sql (запускать в Supabase SQL Editor после применения миграции).
-- 1) Функция на месте и недоступна клиентам (должно быть false/false/false):
select has_function_privilege('anon', 'water_auto_norm_ml(uuid)', 'execute') as anon,
       has_function_privilege('authenticated', 'water_auto_norm_ml(uuid)', 'execute') as authenticated,
       has_function_privilege('public', 'water_auto_norm_ml(uuid)', 'execute') as public_role;
-- 2) Твоя норма по новой формуле (подставь свой user_id): ожидание — при росте 175 см и весе 70 кг → 2210; без роста → 2100.
-- select water_auto_norm_ml('<твой user_id>');
-- 3) Формула на трёх примерах (без обращения к таблицам):
select round(sqrt(175 * 70 / 3600.0) * 1200 / 10) * 10 as h175_w70_expect_2210,
       round(sqrt(185 * 55 / 3600.0) * 1200 / 10) * 10 as h185_w55_expect_2020,
       round(sqrt(160 * 60 / 3600.0) * 1200 / 10) * 10 as h160_w60_expect_1960;
