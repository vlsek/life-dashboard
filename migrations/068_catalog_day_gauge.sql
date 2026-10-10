-- 068: каталог цен — виды спидометра ДНЯ (BACKLOG 53.2 срез 2, агент 1; список и цены — на усмотрение агента по разрешению владельца 2026-10-11).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Обычное кольцо дня — у всех бесплатно (это «ничего не выбрано»), в каталог не входит.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_dashed','day_glow');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_dashed', 'day_gauge', 'points', 100, null),
  ('day_glow', 'day_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
