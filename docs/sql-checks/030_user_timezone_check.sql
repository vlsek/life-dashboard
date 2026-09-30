-- Проверка после применения migrations/030_user_timezone.sql (Supabase -> SQL Editor).
-- Только чтение: ничего не меняет.

-- 1) Колонка появилась: должна вернуться одна строка (timezone | text).
select column_name, data_type from information_schema.columns
where table_name = 'profiles' and column_name = 'timezone';

-- 2) Часовые пояса начали записываться (заполняет Дашборд при входе после деплоя фронта).
--    Сразу после применения миграции пусто — это нормально, пока пользователи не зайдут на Дашборд.
select timezone, count(*) as users from profiles group by timezone order by users desc;

-- 3) «Сегодня» каждого пользователя: local_today должен совпадать с датой на его часах,
--    utc_today — дата по UTC. У пользователей восточнее Гринвича они различаются ночью.
select display_name, timezone, user_today(user_id) as local_today, current_date as utc_today
from profiles order by timezone nulls last limit 20;

-- 4) Функции работают (без ошибок вернут строки).
select display_name, today_points from get_today_activity() limit 5;
select display_name, category_points, category_streak from get_category_leaderboard('pushups', 'week') limit 5;
