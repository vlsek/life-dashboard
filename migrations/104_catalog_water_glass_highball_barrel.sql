-- 104: каталог цен — ещё две платные формы стакана воды «Хайбол» (100) и «Бочонок» (150) (агент 7; правило «если задач нет — предметы кастомизации там, где их меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('glass_highball','glass_barrel');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('glass_highball', 'water_glass', 'points', 100, null),
  ('glass_barrel', 'water_glass', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
