-- 072: каталог цен — анимации питья воды (BACKLOG 54.9 / 56.1, агент 3; список и цены — на усмотрение агента по разрешению владельца 2026-10-11).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Бесплатные анимации (волна, капли, рябь, пузырьки, струя, всплеск) в каталог не входят: это обычная настройка устройства.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_rain','water_tide','water_sparkle');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_rain', 'water_anim', 'points', 100, null),
  ('water_tide', 'water_anim', 'points', 150, null),
  ('water_sparkle', 'water_anim', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
