-- Проверка миграции 061 (только чтение): в серверном каталоге есть 8 новых рамок за монеты с верными ценами.
select item_key, price from customization_catalog
where item_key in ('frame_mint','frame_sky','frame_graphite','frame_coral','frame_sunset','frame_breath','frame_comet','frame_glitch')
order by price, item_key; -- ожидается 8 строк: 3 по 100, 3 по 150, 2 по 250
select count(*) as total_catalog from customization_catalog; -- ожидается 28 (20 из миграции 060 + 8)
