-- 078: каталог цен — ещё две платные анимации воды «Качка» и «Сияние» (BACKLOG 59.4, агент 3; по просьбе владельца 2026-10-12 — «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_sway','water_glow');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_sway', 'water_anim', 'points', 150, null),
  ('water_glow', 'water_anim', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
