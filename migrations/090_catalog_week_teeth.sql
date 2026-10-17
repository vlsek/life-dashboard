-- 090: каталог цен — ещё один платный вид спидометра недели «Зубцы» (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 083 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key = 'week_teeth';

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_teeth', 'week_gauge', 'points', 100, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
