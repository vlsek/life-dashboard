-- 091: каталог цен — ещё два платных вида кольца дня «Нить» (тонкое) и «Закат» (градиент) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 081 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_thin','day_sunset');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_thin', 'day_gauge', 'points', 100, null),
  ('day_sunset', 'day_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
