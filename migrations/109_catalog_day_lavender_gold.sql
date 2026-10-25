-- 109: каталог цен — ещё два платных кольца дня «Лаванда» (100) и «Золото» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_lavender','day_gold');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_lavender', 'day_gauge', 'points', 100, null),
  ('day_gold', 'day_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
