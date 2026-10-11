-- 076: каталог цен — ещё два вида спидометра недели «Семь точек» и «Ступеньки» (BACKLOG 59.3, агент 3; по просьбе владельца 2026-10-12 — «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 067 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('week_dots','week_steps');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_dots', 'week_gauge', 'points', 100, null),
  ('week_steps', 'week_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
