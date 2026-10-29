-- Сценарий для run.sh 111: награда за выполнение цели (миграция 111, BACKLOG 68.2 срез 1). Всё — от лица обычного пользователя (RLS).
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
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  g1 uuid; g_done uuid; g_stage uuid; g_b uuid; g_del uuid;
  w1 uuid; w2 uuid; w3 uuid; w_plain uuid; w_stage uuid; w_del uuid;
  code text; r record; v_cost int; v_sparks int; v_before numeric; v_after numeric; j jsonb;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into goals(user_id, name, stages, current_stage, done) values (a, 'Марафон', 1, 0, false) returning id into g1;
  insert into goals(user_id, name, stages, current_stage, done) values (a, 'Готовая', 1, 0, true) returning id into g_done;
  insert into goals(user_id, name, stages, current_stage, done) values (a, 'Книга в 3 этапа', 3, 2, false) returning id into g_stage;
  insert into goals(user_id, name, stages, current_stage, done) values (a, 'Удаляемая', 1, 0, false) returning id into g_del;
  insert into goals(user_id, name, stages, current_stage, done) values (b, 'Чужая', 1, 0, false) returning id into g_b;
  perform pg_temp.check_('01 колонки goal_id и reward_goal_name есть', '2', (select count(*) from information_schema.columns where table_name = 'shop_items' and column_name in ('goal_id', 'reward_goal_name'))::text);

  v_before := sparks_balance_of(a);

  -- 02 хотелка «за цель»: цена обнуляется
  perform pg_temp.as_user(a);
  insert into shop_items(user_id, name, cost, cost_sparks, goal_id) values (a, 'Кроссовки', 100, 7, g1) returning id into w1;
  reset role;
  select cost, cost_sparks into v_cost, v_sparks from shop_items where id = w1;
  perform pg_temp.check_('02 cost = 0 у вещи за цель', '0', v_cost::text);
  perform pg_temp.check_('02b cost_sparks = NULL у вещи за цель', 'NULL', coalesce(v_sparks::text, 'NULL'));

  -- 03 чужая цель
  perform pg_temp.as_user(a); code := 'none';
  begin insert into shop_items(user_id, name, goal_id) values (a, 'Х', g_b); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('03 чужая цель → GR001', 'GR001', code);
  -- 03b то же от имени владельца БД (SQL Editor / сервисная роль): RLS не помогает, держит сам триггер
  code := 'none';
  begin insert into shop_items(user_id, name, goal_id) values (a, 'Х', g_b); exception when others then code := sqlstate; end;
  perform pg_temp.check_('03b чужая цель без RLS → GR001', 'GR001', code);

  -- 04 выполненную цель привязать нельзя (простая и многоэтапная)
  perform pg_temp.as_user(a); code := 'none';
  begin insert into shop_items(user_id, name, goal_id) values (a, 'Х', g_done); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('04 выполненная цель → GR002', 'GR002', code);
  update goals set current_stage = 3 where id = g_stage; -- временно «выполнена»
  perform pg_temp.as_user(a); code := 'none';
  begin insert into shop_items(user_id, name, goal_id) values (a, 'Х', g_stage); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('04b выполненная по этапам → GR002', 'GR002', code);
  update goals set current_stage = 2 where id = g_stage;

  -- 05 забрать напрямую (redeemed = true) при невыполненной цели нельзя
  perform pg_temp.as_user(a); code := 'none';
  begin update shop_items set redeemed = true where id = w1; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('05 прямой redeemed при невыполненной цели → GR003', 'GR003', code);

  -- 06 через функцию — то же
  perform pg_temp.as_user(a); code := 'none';
  begin perform * from claim_goal_reward(w1); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('06 claim при невыполненной цели → GR003', 'GR003', code);
  perform pg_temp.check_('06b вещь не получена', 'false', (select coalesce(redeemed, false) from shop_items where id = w1)::text);

  -- 07 цель выполнена → забрать награду; баланс не тратится
  update goals set done = true where id = g1;
  perform pg_temp.as_user(a);
  select * into r from claim_goal_reward(w1, date '2026-10-29');
  reset role;
  perform pg_temp.check_('07 снимок названия цели', 'Марафон', coalesce(r.goal_name, 'NULL'));
  perform pg_temp.check_('07b дата получения', '2026-10-29', r.redeemed_date::text);
  perform pg_temp.check_('07c redeemed = true', 'true', (select redeemed from shop_items where id = w1)::text);
  v_after := sparks_balance_of(a);
  perform pg_temp.check_('07d огоньки не потрачены', v_before::text, v_after::text);
  perform pg_temp.check_('07e сумма cost полученных = 0', '0', (select coalesce(sum(cost), 0) from shop_items where user_id = a and redeemed)::text);

  -- 08 повторно нельзя
  perform pg_temp.as_user(a); code := 'none';
  begin perform * from claim_goal_reward(w1); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('08 повторное получение → GR006', 'GR006', code);

  -- 09 чужая и обычная хотелка
  insert into shop_items(user_id, name, cost_sparks) values (a, 'Обычная', 5) returning id into w_plain;
  perform pg_temp.as_user(b); code := 'none';
  begin perform * from claim_goal_reward(w1); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('09 чужая награда → GR005', 'GR005', code);
  perform pg_temp.as_user(a); code := 'none';
  begin perform * from claim_goal_reward(w_plain); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('09b обычная хотелка → GR005', 'GR005', code);
  perform pg_temp.as_user(a); code := 'none';
  begin perform * from claim_goal_reward(gen_random_uuid()); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('09c несуществующий id → GR005', 'GR005', code);

  -- 10 у полученной награды цель менять нельзя
  perform pg_temp.as_user(a); code := 'none';
  begin update shop_items set goal_id = g_stage where id = w1; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('10 смена цели у полученной награды → GR004', 'GR004', code);

  -- 11 многоэтапная: 2 из 3 — нельзя, 3 из 3 — можно
  perform pg_temp.as_user(a);
  insert into shop_items(user_id, name, goal_id) values (a, 'Новый сервис', g_stage) returning id into w_stage;
  code := 'none';
  begin perform * from claim_goal_reward(w_stage); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('11 этапы 2 из 3 → GR003', 'GR003', code);
  update goals set current_stage = 3 where id = g_stage;
  perform pg_temp.as_user(a);
  perform * from claim_goal_reward(w_stage);
  reset role;
  perform pg_temp.check_('11b этапы 3 из 3 → награда получена', 'true', (select redeemed from shop_items where id = w_stage)::text);

  -- 12 цель удалена: полученная награда остаётся со снимком названия; неполученная остаётся без привязки
  perform pg_temp.as_user(a);
  insert into shop_items(user_id, name, goal_id) values (a, 'Хотелка под удаление', g_del) returning id into w_del;
  reset role;
  delete from goals where id = g1;
  delete from goals where id = g_del;
  perform pg_temp.check_('12 полученная награда осталась', 'true', (select redeemed from shop_items where id = w1)::text);
  perform pg_temp.check_('12b привязка снята', 'NULL', coalesce((select goal_id::text from shop_items where id = w1), 'NULL'));
  perform pg_temp.check_('12c название цели помнится', 'Марафон', (select reward_goal_name from shop_items where id = w1));
  perform pg_temp.check_('12d неполученная хотелка осталась без привязки', 'NULL|false', (select coalesce(goal_id::text, 'NULL') || '|' || coalesce(redeemed, false)::text from shop_items where id = w_del));
  -- после удаления цели можно задать цену в огоньках как у обычной хотелки
  perform pg_temp.as_user(a);
  update shop_items set cost_sparks = 4 where id = w_del;
  reset role;
  perform pg_temp.check_('12e цена в огоньках после снятия привязки', '4|0', (select cost_sparks::text || '|' || cost::text from shop_items where id = w_del));

  -- 13 вишлист друга не показывает награды «за цель»
  insert into goals(user_id, name) values (a, 'Ещё цель') returning id into g1;
  perform pg_temp.as_user(a);
  insert into shop_items(user_id, name, goal_id) values (a, 'Секретная награда', g1);
  j := get_friend_wishlist(a);
  reset role;
  perform pg_temp.check_('13 вишлист: награда за цель скрыта', '0', (select count(*) from jsonb_array_elements(j->'items') e where e->>'name' = 'Секретная награда')::text);
  perform pg_temp.check_('13b вишлист: обычная хотелка на месте', '1', (select count(*) from jsonb_array_elements(j->'items') e where e->>'name' = 'Обычная')::text);

  -- 14 удаление аккаунта каскадом
  delete from auth.users where id = a;
  perform pg_temp.check_('14 каскад чистит магазин', '0', (select count(*) from shop_items where user_id = a)::text);
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
