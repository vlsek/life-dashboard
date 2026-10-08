-- Проверка миграции 055 (только чтение).
-- 1) колонка есть: ожидается 1 строка — track_water | boolean | NO | true
select column_name, data_type, is_nullable, column_default from information_schema.columns
where table_name = 'profiles' and column_name = 'track_water';
-- 2) у всех профилей вода включена по умолчанию (до того как кто-то выключил): ожидается false_count = 0 сразу после применения
select count(*) filter (where track_water) as water_on, count(*) filter (where not track_water) as water_off from profiles;
-- 3) справочно: какие профили выключили воду (кто и сколько)
select user_id from profiles where not track_water;
