-- Проверка миграции 052 (только чтение).
-- 1) колонка и функция существуют
select column_name, data_type from information_schema.columns where table_name = 'profiles' and column_name = 'feed_achievements';
select proname from pg_proc where proname = 'get_achievement_feed';
-- 2) ни у кого в выборе больше 5 ключей (ожидается 0)
select count(*) as over_limit from profiles where cardinality(feed_achievements) > 5;
-- 3) в ленту попали только по-настоящему открытые значки из выбора (ожидается 0)
select count(*) as not_unlocked
from get_achievement_feed(365, 100) f
left join user_achievements a on a.user_id = f.user_id and a.key = f.key and a.unlocked_at is not null
where a.key is null;
