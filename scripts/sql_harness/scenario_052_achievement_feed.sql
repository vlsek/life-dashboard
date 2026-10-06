-- Сценарий для run.sh 052: лента достижений (BACKLOG 395). Видимый с выбором, выбранный-но-не-открытый (вписал руками),
-- открытый-но-не-выбранный, скрытый с выбором, «я» (скрыт), давнее событие, '_baseline', запись без даты, лимит «не больше 5».
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
do $$
declare v uuid := gen_random_uuid(); h uuid := gen_random_uuid(); me uuid := gen_random_uuid(); rej int := 0;
begin
  insert into auth.users(id) values (v), (h), (me);
  insert into profiles(user_id, display_name, leaderboard_visible, feed_achievements) values
    (v, 'Виден', true, array['streak_30', 'goals_10', 'books_5', 'first_goal']),
    (h, 'Скрыт', false, array['streak_30']),
    (me, 'Я', false, array['first_skill']);
  insert into user_achievements(user_id, key, unlocked_at) values
    (v, 'streak_30', now() - interval '1 day'),   -- выбран и открыт → в ленте
    (v, 'points_100', now() - interval '1 day'),  -- открыт, но не выбран → нет
    (v, 'goals_10', now() - interval '60 days'),  -- выбран, но давно → нет при 30 днях, да при 365
    (v, 'books_5', null),                         -- выбран, но дата неизвестна → нет
    (v, '_baseline', now()),                      -- служебная
    (h, 'streak_30', now() - interval '1 day'),   -- скрытый → чужим нет
    (me, 'first_skill', now() - interval '2 days'); -- «я» скрыт, но своё вижу
  -- 'first_goal' выбран у v, но НЕ открыт (вписал руками) → строки нет
  perform set_config('request.jwt.claim.sub', me::text, true);
  insert into res select 'виден, выбран и открыт: в ленте', 1, count(*) from get_achievement_feed() where user_id = v and key = 'streak_30';
  insert into res select 'открыт, но не выбран: нет', 0, count(*) from get_achievement_feed() where user_id = v and key = 'points_100';
  insert into res select 'выбран, не открыт (вписал руками): нет', 0, count(*) from get_achievement_feed(365, 100) where user_id = v and key = 'first_goal';
  insert into res select 'старше окна 30 дней: нет', 0, count(*) from get_achievement_feed() where user_id = v and key = 'goals_10';
  insert into res select 'то же в окне 365 дней: есть', 1, count(*) from get_achievement_feed(365, 100) where user_id = v and key = 'goals_10';
  insert into res select 'без даты: нет', 0, count(*) from get_achievement_feed(365, 100) where key = 'books_5';
  insert into res select '_baseline: нет', 0, count(*) from get_achievement_feed(365, 100) where key = '_baseline';
  insert into res select 'скрытый чужой: нет', 0, count(*) from get_achievement_feed(365, 100) where user_id = h;
  insert into res select 'я сам (скрыт): своё событие', 1, count(*) from get_achievement_feed() where user_id = me and key = 'first_skill';
  insert into res select 'лимит 1 строка', 1, count(*) from get_achievement_feed(365, 1);
  begin
    update profiles set feed_achievements = array['a','b','c','d','e','f'] where user_id = v;
  exception when check_violation then rej := 1;
  end;
  insert into res values ('шесть ключей: БД отклоняет', 1, rej);
  update profiles set feed_achievements = array['a','b','c','d','e'] where user_id = v;
  insert into res select 'пять ключей: можно', 1, cardinality(feed_achievements) - 4 from profiles where user_id = v;
end $$;
select format('%-44s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
