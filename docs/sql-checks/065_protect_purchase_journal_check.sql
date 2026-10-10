-- Проверка миграции 065 (только чтение): охрана журнала покупок Кастомизации.
select count(*) as source_column from information_schema.columns
where table_schema = 'public' and table_name = 'shop_items' and column_name = 'source'; -- ожидается 1
select count(*) as guard_trigger from pg_trigger
where tgname = 'shop_items_purchase_guard' and tgrelid = 'public.shop_items'::regclass and not tgisinternal; -- ожидается 1
select (pg_get_functiondef('public.buy_customization(text, text)'::regprocedure) like '%''customization''%') as buy_marks_row; -- ожидается true (серверная покупка помечает строку)
select count(*) as unmarked_old_purchases from shop_items
where source is null and coalesce(redeemed, false)
  and (ltrim(name) like 'Кастомизация:%' or ltrim(name) like 'Customization:%'); -- ожидается 0 (старые покупки помечены)
select count(*) as marked_purchases from shop_items where source = 'customization'; -- число покупок Кастомизации (информативно)
