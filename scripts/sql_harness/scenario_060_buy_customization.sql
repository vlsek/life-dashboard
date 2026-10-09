-- Сценарий для run.sh 060: серверная покупка предметов Кастомизации (BACKLOG 47.6, срез 2). Всё — от лица ОБЫЧНОГО пользователя (роль authenticated, RLS включён).
\set ON_ERROR_STOP 0
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
grant select, insert, update, delete on all tables in schema public to authenticated;   -- как стандартные права Supabase; 060 отзывает лишнее, но здесь права выданы заново ради проверки RLS
grant execute on all functions in schema public to authenticated;
grant select, insert on res to authenticated;

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true);
  execute 'set local role authenticated';
end $f$;

do $$
declare rich uuid := gen_random_uuid(); poor uuid := gen_random_uuid(); ach uuid := gen_random_uuid();
        r record; code text; n int; ids text;
begin
  insert into auth.users(id, email) values (rich, 'rich@x'), (poor, 'poor@x'), (ach, 'ach@x');
  insert into profiles(user_id, display_name) values (rich, 'Богатый'), (poor, 'Бедный'), (ach, 'Достижения');
  insert into achievement_bonuses(user_id, key, coins) values (rich, 'seed_rich', 500), (poor, 'seed_poor', 50);

  perform pg_temp.as_user(rich);
  select * into r from buy_customization('frame_neon', 'Кастомизация: Неон (подмена цены не работает)');
  reset role;
  insert into res select 'покупка: списана цена из каталога (100)', 100, r.spent;
  insert into res select 'покупка: новый баланс 400', 400, r.new_balance;
  insert into res select 'предмет открыт, источник points', 1, (select count(*) from user_customizations where user_id = rich and item_key = 'frame_neon' and source = 'points');
  insert into res select 'в истории Магазина ровно одна строка, cost=100, redeemed', 1, (select count(*) from shop_items where user_id = rich and cost = 100 and redeemed);

  perform pg_temp.as_user(rich);
  begin perform buy_customization('frame_neon', 'x'); code := 'none'; exception when others then code := sqlstate; end;
  reset role;
  insert into res select 'повторная покупка → 23505', 1, (code = '23505')::int;
  insert into res select 'второго списания нет', 1, (select count(*) from shop_items where user_id = rich);

  perform pg_temp.as_user(rich);
  select * into r from buy_customization('frame_aurora');
  reset role;
  insert into res select 'вторая покупка: баланс 250', 250, r.new_balance;
  insert into res select 'без подписи в истории — имя = ключ предмета', 1, (select count(*) from shop_items where user_id = rich and name = 'frame_aurora');

  perform pg_temp.as_user(poor);
  begin perform buy_customization('frame_neon'); code := 'none'; exception when others then code := sqlstate; end;
  reset role;
  insert into res select 'не хватает баллов → CU004', 1, (code = 'CU004')::int;
  insert into res select 'при отказе ни предмета, ни списания', 0, (select count(*) from user_customizations where user_id = poor) + (select count(*) from shop_items where user_id = poor);

  perform pg_temp.as_user(rich);
  begin perform buy_customization('frame_nonexistent'); code := 'none'; exception when others then code := sqlstate; end;
  reset role;
  insert into res select 'неизвестный предмет → CU002', 1, (code = 'CU002')::int;
  perform pg_temp.as_user(rich);
  begin perform buy_customization('frame_gold'); code := 'none'; exception when others then code := sqlstate; end;
  reset role;
  insert into res select 'награду за достижение купить нельзя → CU003', 1, (code = 'CU003')::int;

  perform pg_temp.as_user(null);
  begin perform buy_customization('frame_flame'); code := 'none'; exception when others then code := sqlstate; end;
  reset role;
  insert into res select 'без входа → 28000', 1, (code = '28000')::int;

  -- прямая запись: после 060 нет ни прав, ни политик; здесь права выданы заново, поэтому проверяем RLS (вставка без политики insert отклоняется, удаление удаляет 0 строк)
  perform pg_temp.as_user(rich);
  begin insert into user_customizations(user_id, item_key, source) values (rich, 'frame_flame', 'points'); code := 'none'; exception when others then code := sqlstate; end;
  insert into res select 'прямая вставка предмета закрыта', 1, (code <> 'none')::int;
  begin delete from user_customizations where user_id = rich; exception when others then null; end;
  select count(*) into n from user_customizations where user_id = rich;
  reset role;
  insert into res select 'прямое удаление ничего не удалило, свои предметы читаются (2)', 2, n;

  perform pg_temp.as_user(rich);
  select count(*) into n from customization_catalog;
  begin update customization_catalog set price = 1 where item_key = 'frame_flame'; exception when others then null; end;
  reset role;
  insert into res select 'каталог читается (28 предметов: 20 из 060 + 8 рамок из 061)', 28, n;
  insert into res select 'цену в каталоге клиент поменять не может', 250, (select price from customization_catalog where item_key = 'frame_flame');

  insert into user_achievements(user_id, key) values (ach, 'streak_30'), (ach, 'no_such_badge');
  perform pg_temp.as_user(ach);
  select string_agg(x, ',' order by x) into ids from claim_achievement_items() as x;
  reset role;
  insert into res select 'награда выдана по значку streak_30 (frame_gold)', 1, (ids = 'frame_gold')::int;
  perform pg_temp.as_user(ach);
  select count(*) into n from claim_achievement_items();
  reset role;
  insert into res select 'повторная выдача ничего не добавляет (идемпотентно)', 0, n;
  perform pg_temp.as_user(poor);
  select count(*) into n from claim_achievement_items();
  reset role;
  insert into res select 'без значка награда не выдаётся', 0, n;
  insert into res select 'у владельца значка источник achievement', 1, (select count(*) from user_customizations where user_id = ach and item_key = 'frame_gold' and source = 'achievement');
end $$;
select format('%-62s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
