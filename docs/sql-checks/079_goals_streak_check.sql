-- Проверка миграции 079 (read-only): функции есть; под своим пользователем — текущая и лучшая серия по целям.
select proname, prosecdef as security_definer from pg_proc where proname in ('calc_goals_streak', 'get_my_goals_streak') order by 1;
-- Вручную в приложении (под своим пользователем): select get_my_goals_streak();
-- Сверка: дни с выполненной целью за последние 14 дней
select done_date, count(*) from goals where done = true and done_date >= current_date - 14 group by 1 order by 1 desc;
