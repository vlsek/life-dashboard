-- Проверка миграции 046 (только чтение). В Supabase SQL Editor выполнять под ролью с auth.uid() не нужно — функция security definer.
-- 1) функция существует
select proname, pg_get_function_arguments(oid) from pg_proc where proname = 'get_leaderboard_period';
-- 2) 'all' совпадает с get_leaderboard() по баллам (расхождений быть не должно)
select count(*) as mismatches
from get_leaderboard_period('all') a
join get_leaderboard() b using (user_id)
where a.total_points <> b.total_points::numeric;
-- 3) неделя не больше «всего времени» (баллы за дни ⊆ все баллы)
select count(*) as week_gt_all
from get_leaderboard_period('week') w
join get_leaderboard_period('all') a using (user_id)
where w.total_points > a.total_points;
