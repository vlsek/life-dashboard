-- 061: каталог цен — 8 новых рамок аватарки за монеты (BACKLOG 46.2, срез (а), агент 2). Продолжение миграции 060 (серверная покупка).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка новых рамок отвечает «неизвестный предмет».
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('frame_mint','frame_sky','frame_graphite','frame_coral','frame_sunset','frame_breath','frame_comet','frame_glitch');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_mint', 'avatar_frame', 'points', 100, null),
  ('frame_sky', 'avatar_frame', 'points', 100, null),
  ('frame_graphite', 'avatar_frame', 'points', 100, null),
  ('frame_coral', 'avatar_frame', 'points', 150, null),
  ('frame_sunset', 'avatar_frame', 'points', 150, null),
  ('frame_breath', 'avatar_frame', 'points', 150, null),
  ('frame_comet', 'avatar_frame', 'points', 250, null),
  ('frame_glitch', 'avatar_frame', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
