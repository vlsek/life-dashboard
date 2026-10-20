-- 104: каталог цен — ещё две платные рамки-орнамента «Шина» и «Штурвал» (BACKLOG 44.18з, срез 2).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 103 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('frame_tyre','frame_helm');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_tyre', 'avatar_frame', 'points', 150, null),
  ('frame_helm', 'avatar_frame', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
