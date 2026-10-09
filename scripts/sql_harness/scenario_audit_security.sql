-- Сценарий аудита безопасности (BACKLOG 47.6, агент 1): попытки обхода, выполненные от лица ОБЫЧНОГО пользователя (роль authenticated, RLS включён).
-- Ожидание везде — «защищено»; расхождение = найденная дыра. Группы: [059] закрывает миграция 059 (флаг админа); [ПОКУПКИ] — известные пробелы,
-- которые закрывают следующие срезы 47.6 (серверная покупка, журнал, награды). Запуск: run.sh 054 scenario_audit_security.sql (до) и run.sh 059 ... (после).
\set ON_ERROR_STOP 0
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
grant select, insert, update, delete on all tables in schema public to authenticated;   -- как стандартные права Supabase
grant execute on all functions in schema public to authenticated;
grant select on res to authenticated; grant insert on res to authenticated;

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  execute 'set local role authenticated';
end $f$;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid(); e uuid := gen_random_uuid();
        blocked boolean; n int;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x'), (c, 'c@x'), (d, 'd@x'), (e, 'e@x');
  insert into profiles(user_id, display_name) values (a, 'Обычный'), (b, 'Жертва'), (d, 'Админ через SQL');

  -- [059] обычный пользователь пытается сделать себя админом
  perform pg_temp.as_user(a);
  begin update profiles set is_admin = true where user_id = a; exception when others then null; end;
  reset role;
  insert into res select '[059] самовыдача is_admin заблокирована', 1, (not coalesce((select is_admin from profiles where user_id = a), false))::int;

  perform pg_temp.as_user(a);
  begin perform admin_list_users(); blocked := false; exception when others then blocked := true; end;
  reset role;
  insert into res select '[059] после попытки admin_list_users недоступен', 1, blocked::int;

  perform pg_temp.as_user(a);
  begin perform admin_delete_user(b); exception when others then null; end;
  reset role;
  insert into res select '[059] чужой аккаунт не удалён', 1, (exists (select 1 from auth.users where id = b))::int;

  -- [059] вставка своей строки профиля с is_admin = true
  perform pg_temp.as_user(c);
  begin insert into profiles(user_id, display_name, is_admin) values (c, 'Хитрый', true); exception when others then null; end;
  reset role;
  insert into res select '[059] вставка профиля с is_admin=true не даёт прав', 1, (not coalesce((select is_admin from profiles where user_id = c), false))::int;

  -- [059] но владелец базы (SQL Editor, без роли приложения) по-прежнему выдаёт админа вручную
  update profiles set is_admin = true where user_id = d;
  insert into res select '[059] админа можно выдать вручную в SQL', 1, coalesce((select is_admin from profiles where user_id = d), false)::int;

  -- [059] обычные поля профиля клиент по-прежнему пишет (апсерт без is_admin)
  perform pg_temp.as_user(a);
  begin update profiles set display_name = 'Новое имя' where user_id = a; blocked := false; exception when others then blocked := true; end;
  reset role;
  insert into res select '[059] обычная правка профиля работает', 1, (not blocked and (select display_name from profiles where user_id = a) = 'Новое имя')::int;

  -- рамка в Сообществе: выбранная, но не открытая рамка не показывается
  perform pg_temp.as_user(a);
  update profiles set customization = '{"avatar_frame":"frame_inferno"}' where user_id = a;
  select count(*) into n from get_public_frames() g where g.user_id = a and g.frame is not null;
  reset role;
  insert into res select 'чужая/неоткрытая рамка не показывается (049)', 1, (n = 0)::int;

  -- [ПОКУПКИ] бесплатный предмет «за достижение» без достижения
  perform pg_temp.as_user(a);
  begin insert into user_customizations(user_id, item_key, source) values (a, 'frame_inferno', 'achievement'); blocked := false; exception when others then blocked := true; end;
  reset role;
  insert into res select '[ПОКУПКИ] нельзя выдать себе награду-предмет', 1, blocked::int;

  -- [ПОКУПКИ] бесплатный предмет «за баллы» без списания
  perform pg_temp.as_user(a);
  begin insert into user_customizations(user_id, item_key, source) values (a, 'frame_gold', 'points'); blocked := false; exception when others then blocked := true; end;
  reset role;
  insert into res select '[ПОКУПКИ] нельзя «купить» без списания баллов', 1, blocked::int;

  -- [ЗНАЧКИ-пробел] награда по подделанному значку: user_achievements пишет клиент (срез 6 аудита закроет серверной сверкой условий значков)
  perform pg_temp.as_user(c);
  begin
    insert into user_achievements(user_id, key) values (c, 'streak_100');
    perform claim_achievement_items();
  exception when others then null; end;
  reset role;
  insert into res select '[ЗНАЧКИ-пробел] награда-предмет не выдаётся по подделанному значку', 1, (not exists (select 1 from user_customizations where user_id = c and item_key = 'frame_inferno'))::int;

  -- [ПОКУПКИ] бонусные монеты: произвольные ключи по 500
  perform pg_temp.as_user(a);
  begin
    for i in 1..20 loop insert into achievement_bonuses(user_id, key, coins) values (a, 'fake_' || i, 500); end loop;
  exception when others then null; end;
  reset role;
  insert into res select '[ПОКУПКИ] нельзя выдать себе бонусные монеты', 1, ((select coalesce(sum(coins), 0) from achievement_bonuses where user_id = a) = 0)::int;

  -- [ПОКУПКИ] «возврат» потраченного: удалить строку покупки
  -- (отдельный пользователь e: в версии «до 057» жертва b уже удалена эксплойтом выше, и без этого сценарий падал на внешнем ключе)
  insert into user_customizations(user_id, item_key, source) values (e, 'frame_neon', 'points');
  insert into shop_items(user_id, name, cost, redeemed) values (e, 'Кастомизация: Неон', 50, true);
  perform pg_temp.as_user(e);
  begin delete from shop_items where user_id = e and name like 'Кастомизация%'; exception when others then null; end;
  reset role;
  insert into res select '[ПОКУПКИ] нельзя стереть запись о покупке (вернуть монеты)', 1, (exists (select 1 from shop_items where user_id = e and name like 'Кастомизация%'))::int;
end $$;
select format('%-62s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
