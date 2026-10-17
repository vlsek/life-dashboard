-- 095: каталог цен — ещё две платные анимации воды «Наклон» (100) и «Вспышка» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_tilt','water_flash');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_tilt', 'water_anim', 'points', 100, null),
  ('water_flash', 'water_anim', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
