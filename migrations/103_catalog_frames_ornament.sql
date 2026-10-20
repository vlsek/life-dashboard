-- 103: каталог цен — три платные рамки-орнамента «не кругом» (BACKLOG 44.18з, срез 1): «Лавровый венок», «Лианы», «Вензель».
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 102 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('frame_wreath','frame_vines','frame_flourish');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_wreath', 'avatar_frame', 'points', 250, null),
  ('frame_vines', 'avatar_frame', 'points', 150, null),
  ('frame_flourish', 'avatar_frame', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
