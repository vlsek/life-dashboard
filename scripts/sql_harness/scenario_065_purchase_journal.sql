-- Сценарий для run.sh 065: охрана журнала покупок Кастомизации (миграция 065, BACKLOG 47.6 срез 4). Всё — от лица ОБЫЧНОГО пользователя (роль authenticated, RLS включён).
-- Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant all on pg_temp.res to public;
grant all on sequence pg_temp.res_n_seq to public;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true);
  execute 'set local role authenticated';
end $f$;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void language plpgsql as $f$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $f$;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); r record; code text; n int; v_id uuid; v_wish uuid; v_cost int; v_src text;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into achievement_bonuses(user_id, key, coins) values (a, 'seed_a', 500);

  perform pg_temp.check_('01 колонка shop_items.source есть', '1', (select count(*) from information_schema.columns where table_name = 'shop_items' and column_name = 'source')::text);

  -- 02 серверная покупка помечает строку списания
  perform pg_temp.as_user(a);
  select * into r from buy_customization('frame_neon', 'Кастомизация: Неон');
  reset role;
  select id, source into v_id, v_src from shop_items where user_id = a and cost = 100;
  perform pg_temp.check_('02 покупка помечена source=customization', 'customization', coalesce(v_src, 'NULL'));

  -- 03 «вернуть монеты»: удалить строку покупки нельзя
  perform pg_temp.as_user(a);
  code := 'none';
  begin delete from shop_items where id = v_id; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('03 удаление строки покупки → 42501', '42501', code);
  perform pg_temp.check_('04 строка на месте', '1', (select count(*) from shop_items where id = v_id)::text);

  -- 05 уменьшить цену / снять «куплено» нельзя
  perform pg_temp.as_user(a);
  code := 'none';
  begin update shop_items set cost = 1 where id = v_id; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('05 правка цены → 42501', '42501', code);
  perform pg_temp.as_user(a);
  code := 'none';
  begin update shop_items set redeemed = false where id = v_id; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('06 снять «куплено» → 42501', '42501', code);
  select cost into v_cost from shop_items where id = v_id;
  perform pg_temp.check_('07 цена в журнале не изменилась', '100', v_cost::text);

  -- 08 снять пометку нельзя (иначе строку потом можно удалить)
  perform pg_temp.as_user(a);
  code := 'none';
  begin update shop_items set source = null where id = v_id; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('08 снять пометку → 42501', '42501', code);

  -- 09 клиент не может создать «серверную» строку: пометка при вставке обнуляется
  perform pg_temp.as_user(a);
  insert into shop_items(user_id, name, cost, redeemed, source) values (a, 'Моё желание', 30, false, 'customization') returning id into v_wish;
  reset role;
  perform pg_temp.check_('09 пометка клиента при вставке обнулена', 'NULL', coalesce((select source from shop_items where id = v_wish), 'NULL'));

  -- 10 обычное желание Магазина живёт как раньше: править, «купить», удалить
  perform pg_temp.as_user(a);
  update shop_items set cost = 40 where id = v_wish;
  update shop_items set redeemed = true, redeemed_date = current_date where id = v_wish;
  delete from shop_items where id = v_wish;
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.check_('10 обычное желание: правка, покупка, удаление работают', '1', n::text);

  -- 11 чужой пользователь не может ни удалить, ни изменить чужую строку (RLS)
  perform pg_temp.as_user(b);
  delete from shop_items where id = v_id;
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.check_('11 чужую строку удалить нельзя (0 строк)', '0', n::text);

  -- 12 баланс после попыток обхода: вторая покупка видит трату первой
  perform pg_temp.as_user(a);
  select * into r from buy_customization('frame_aurora');
  reset role;
  perform pg_temp.check_('12 баланс после 2 покупок: 500 − 100 − цена второй', (500 - 100 - r.spent)::text, round(r.new_balance)::text);

  -- 13 владелец БД (SQL Editor / сервисная роль) помеченную строку удалить может; каскад при удалении аккаунта не блокируется
  delete from shop_items where id = v_id;
  perform pg_temp.check_('13 владелец БД может удалить помеченную строку', '0', (select count(*) from shop_items where id = v_id)::text);
  delete from auth.users where id = a;
  perform pg_temp.check_('14 удаление аккаунта каскадом чистит журнал', '0', (select count(*) from shop_items where user_id = a)::text);
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
