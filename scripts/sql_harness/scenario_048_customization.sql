-- Сценарий для run.sh 048: user_customizations + profiles.customization (BACKLOG 491).
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
do $$
declare u uuid := gen_random_uuid(); ok boolean;
begin
  insert into auth.users(id) values (u);
  insert into profiles(user_id, display_name) values (u, 'Тест');
  insert into res select 'новый профиль: customization = {}', 1, (customization = '{}'::jsonb)::int from profiles where user_id = u;
  insert into user_customizations(user_id, item_key, source) values (u, 'frame_neon', 'points'), (u, 'frame_gold', 'achievement');
  insert into res select 'два предмета открыто', 2, count(*) from user_customizations where user_id = u;
  begin
    insert into user_customizations(user_id, item_key, source) values (u, 'frame_neon', 'points');
    ok := false;
  exception when unique_violation then ok := true; end;
  insert into res select 'повторное открытие запрещено (PK)', 1, ok::int;
  begin
    insert into user_customizations(user_id, item_key, source) values (u, 'x', 'gift');
    ok := false;
  exception when check_violation then ok := true; end;
  insert into res select 'неизвестный source запрещён', 1, ok::int;
  update profiles set customization = '{"avatar_frame": "frame_neon"}' where user_id = u;
  insert into res select 'выбор сохраняется', 1, (customization ->> 'avatar_frame' = 'frame_neon')::int from profiles where user_id = u;
  insert into res select 'RLS включён', 1, (select relrowsecurity::int from pg_class where relname = 'user_customizations');
  insert into res select 'политика «только своё» есть', 1, (select count(*) from pg_policies where tablename = 'user_customizations' and policyname = 'own user_customizations');
end $$;
select format('%-40s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
