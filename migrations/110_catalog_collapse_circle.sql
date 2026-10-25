-- 110: каталог цен — ещё один платный вид маркера сворачивания блоков «Стрелка в кружке» (100) (агент 7; правило «если задач нет — предметы кастомизации там, где их меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key = 'collapse_circle';

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('collapse_circle', 'collapse_style', 'points', 100, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
