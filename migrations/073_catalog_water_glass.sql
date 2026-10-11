-- 073: каталог цен — вид САМОГО стакана воды (BACKLOG 57.2б, уточнение владельца 13:14; агент 1).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('glass_mug','glass_bottle','glass_flask','glass_goblet');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('glass_mug', 'water_glass', 'points', 100, null),
  ('glass_bottle', 'water_glass', 'points', 150, null),
  ('glass_flask', 'water_glass', 'points', 150, null),
  ('glass_goblet', 'water_glass', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
