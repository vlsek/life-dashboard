-- Сценарий для run.sh 123: повторяемая награда магазина (миграция 124, BACKLOG 78.9). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant select, insert, update, delete on all tables in schema public to authenticated;
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
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); w uuid; c uuid; rej int;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into shop_items(user_id, name, cost, cost_sparks) values (a, 'Кофе', 0, 2) returning id into w;
  perform pg_temp.check_('1 по умолчанию вещь не повторяемая', 'false', (select repeatable::text from shop_items where id = w));
  perform pg_temp.as_user(a);
  update shop_items set repeatable = true where id = w;
  reset role;
  perform pg_temp.check_('2 владелец включает повтор', 'true', (select repeatable::text from shop_items where id = w));
  perform pg_temp.as_user(b);
  update shop_items set repeatable = false where id = w;
  reset role;
  perform pg_temp.check_('3 чужую вещь изменить нельзя', 'true', (select repeatable::text from shop_items where id = w));
  rej := 0;
  perform pg_temp.as_user(a);
  begin
    insert into shop_items(user_id, name, cost, cost_sparks, redeemed, redeemed_date, repeat_of) values (a, 'Кофе', 0, 2, true, current_date, w);
  exception when raise_exception then rej := 1;
  end;
  reset role;
  perform pg_temp.check_('4 копия-покупка без огоньков на балансе отклонена охраной 057', '1', rej::text);
  insert into shop_items(user_id, name, cost, cost_sparks, repeat_of) values (a, 'Копия', 0, 2, w) returning id into c;
  perform pg_temp.check_('5 repeat_of хранится', w::text, (select repeat_of::text from shop_items where id = c));
  delete from shop_items where id = w;
  perform pg_temp.check_('6 удалили вещь — копия остаётся, ссылка пуста', 'NULL', (select coalesce(repeat_of::text, 'NULL') from shop_items where id = c));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
