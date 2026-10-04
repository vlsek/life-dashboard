-- Проверка миграции 047 (только чтение).
-- 1) функция существует
select proname from pg_proc where proname = 'get_public_badges';
-- 2) служебной строки нет в выдаче (ожидается 0)
select count(*) as baseline_rows from get_public_badges() where key = '_baseline';
-- 3) скрытые из лидерборда в выдаче только если это вы сами (ожидается 0; под ролью authenticated, в SQL Editor auth.uid() = null — тогда 0 строк своих)
select count(*) as hidden_leaks
from get_public_badges() b
join profiles p on p.user_id = b.user_id
where p.leaderboard_visible = false and b.user_id is distinct from auth.uid();
