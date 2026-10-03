-- Сценарий для run.sh 046: get_leaderboard_period (BACKLOG 393). Один пользователь, три булевых метрики на разные даты:
-- сегодня (1 балл), 3 дня назад в прошлой неделе (2 балла), 40 дней назад (4 балла). Печатает OK / РАСХОЖДЕНИЕ. Только на тестовой БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
do $$
declare u uuid := gen_random_uuid(); m1 uuid := gen_random_uuid(); m2 uuid := gen_random_uuid(); m3 uuid := gen_random_uuid();
  td date := current_date; lw date := (date_trunc('week', current_date) - interval '3 days')::date; old date := current_date - 40;
begin
  insert into auth.users(id) values (u);
  insert into profiles(user_id, display_name) values (u, 'Тест');
  insert into metrics(id, user_id, name, type) values (m1, u, 'a', 'boolean'), (m2, u, 'b', 'boolean'), (m3, u, 'c', 'boolean');
  insert into daily_values(user_id, date, metric_id, value) values (u, td, m1, 'true'), (u, lw, m1, 'true'), (u, lw, m2, 'true'), (u, old, m1, 'true'), (u, old, m2, 'true'), (u, old, m3, 'true'), (u, old - 1, m1, 'true');
  insert into res select 'week', 1, total_points from get_leaderboard_period('week') where user_id = u;
  insert into res select 'last_week', 2, total_points from get_leaderboard_period('last_week') where user_id = u;
  insert into res select 'all = calc_user_points', calc_user_points(u), total_points from get_leaderboard_period('all') where user_id = u;
  insert into res select 'all = 7 (1+2+3+1 по датам)', 7, total_points from get_leaderboard_period('all') where user_id = u;
  insert into res select 'неизвестный ключ = all', calc_user_points(u), total_points from get_leaderboard_period('xyz') where user_id = u;
  insert into res select 'month не больше all', 1, 1 where (select total_points from get_leaderboard_period('month') where user_id = u) <= (select total_points from get_leaderboard_period('all') where user_id = u);
end $$;
select format('%-34s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
