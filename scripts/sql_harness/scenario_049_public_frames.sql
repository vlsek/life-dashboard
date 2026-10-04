-- Сценарий для run.sh 049: get_public_frames (BACKLOG 491). Видимый с открытой рамкой, видимый с НЕоткрытой (вписал ключ руками),
-- скрытый с открытой, «я» (скрыт) с открытой. auth.uid() задаём через request.jwt.claim.sub.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
do $$
declare v uuid := gen_random_uuid(); cheat uuid := gen_random_uuid(); h uuid := gen_random_uuid(); me uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (v), (cheat), (h), (me);
  insert into profiles(user_id, display_name, leaderboard_visible, customization) values
    (v, 'Виден', true, '{"avatar_frame": "frame_neon"}'),
    (cheat, 'Хитрец', true, '{"avatar_frame": "frame_gold"}'),
    (h, 'Скрыт', false, '{"avatar_frame": "frame_neon"}'),
    (me, 'Я', false, '{"avatar_frame": "frame_aurora"}');
  insert into user_customizations(user_id, item_key, source) values (v, 'frame_neon', 'points'), (h, 'frame_neon', 'points'), (me, 'frame_aurora', 'points');
  perform set_config('request.jwt.claim.sub', me::text, true);
  insert into res select 'виден и открыто: рамка отдана', 1, count(*) from get_public_frames() where user_id = v and frame = 'frame_neon';
  insert into res select 'не открыто (вписал руками): нет', 0, count(*) from get_public_frames() where user_id = cheat;
  insert into res select 'скрытый чужой: нет', 0, count(*) from get_public_frames() where user_id = h;
  insert into res select 'я сам (скрыт): своя рамка', 1, count(*) from get_public_frames() where user_id = me and frame = 'frame_aurora';
end $$;
select format('%-38s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
