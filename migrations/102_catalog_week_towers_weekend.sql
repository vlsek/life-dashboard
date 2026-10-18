-- 102: каталог цен — ещё два платных вида шкалы недели «Башни» (100) и «Выходные» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('week_towers','week_weekend');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_towers', 'week_gauge', 'points', 100, null),
  ('week_weekend', 'week_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
