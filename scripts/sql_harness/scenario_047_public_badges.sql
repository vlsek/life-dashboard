-- Сценарий для run.sh 047: get_public_badges (BACKLOG 393). Три пользователя: видимый, скрытый, «я» (скрытый). auth.uid() задаём через request.jwt.claim.sub.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
do $$
declare v uuid := gen_random_uuid(); h uuid := gen_random_uuid(); me uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (v), (h), (me);
  insert into profiles(user_id, display_name, leaderboard_visible) values (v, 'Виден', true), (h, 'Скрыт', false), (me, 'Я', false);
  insert into user_achievements(user_id, key, unlocked_at) values
    (v, 'first_metric', now()), (v, 'streak_5', now() - interval '1 day'), (v, '_baseline', now()),
    (h, 'first_metric', now()), (me, 'points_100', now()), (me, '_baseline', now());
  perform set_config('request.jwt.claim.sub', me::text, true);
  insert into res select 'виден: 2 значка, _baseline нет', 2, count(*) from get_public_badges() where user_id = v;
  insert into res select 'скрытый чужой: 0', 0, count(*) from get_public_badges() where user_id = h;
  insert into res select 'я сам (скрыт): свои 1 значок', 1, count(*) from get_public_badges() where user_id = me;
  insert into res select '_baseline нигде', 0, count(*) from get_public_badges() where key = '_baseline';
  insert into res select 'порядок: сначала новее', 1, (select (array_agg(key order by unlocked_at desc nulls last))[1] = 'first_metric')::int from get_public_badges() where user_id = v;
end $$;
select format('%-36s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
