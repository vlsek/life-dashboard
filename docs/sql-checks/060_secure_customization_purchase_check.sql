-- Проверка ПОСЛЕ применения migrations/060_secure_customization_purchase.sql (BACKLOG 47.6, срез 2). Выполнять в Supabase SQL Editor.

-- 1) Каталог цен на месте: ожидается 20 строк (по 10 за монеты и за достижения — как в реестре; точное число зависит от реестра на день применения).
select source, count(*) from customization_catalog group by source order by source;

-- 2) Обе функции на месте: ожидается 2 строки.
select proname from pg_proc where proname in ('buy_customization', 'claim_achievement_items') order by 1;

-- 3) Клиенту закрыта прямая запись в user_customizations: ожидается insert=false, update=false, delete=false, select=true.
select has_table_privilege('authenticated', 'user_customizations', 'insert') as insert,
       has_table_privilege('authenticated', 'user_customizations', 'update') as upd,
       has_table_privilege('authenticated', 'user_customizations', 'delete') as del,
       has_table_privilege('authenticated', 'user_customizations', 'select') as sel;

-- 4) Анонимам функции недоступны: ожидается false.
select has_function_privilege('anon', 'buy_customization(text,text)', 'execute');

-- 5) Живая проверка глазами: зайти в «Кастомизацию», купить самый дешёвый предмет — баланс должен уменьшиться на цену, предмет стать «получено»,
--    а в Магазине в «Купленном» появиться одна строка «Кастомизация: …». Повторное нажатие/вторая вкладка второй раз не спишут.
