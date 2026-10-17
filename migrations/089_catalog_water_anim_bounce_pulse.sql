-- 089: каталог цен — ещё две платные анимации воды «Прыжок» и «Пульс» (BACKLOG 59.4; правило владельца «если задач нет — новые предметы в разделы, где их меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 078 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_bounce','water_pulse');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_bounce', 'water_anim', 'points', 100, null),
  ('water_pulse', 'water_anim', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
