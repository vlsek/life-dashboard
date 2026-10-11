-- 071: каталог цен — ещё два вида спидометра ДНЯ (BACKLOG 53.2 срез 3 / 56.1, агент 1).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 и 068 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_ticks','day_gradient');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_ticks', 'day_gauge', 'points', 150, null),
  ('day_gradient', 'day_gauge', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
