-- Сценарий для run.sh 121: названия этапов цели (миграция 121, BACKLOG 76.2). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
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
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); g1 uuid;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into goals(user_id, name, stages) values (a, 'Ремонт', 3) returning id into g1;
  perform pg_temp.check_('1 у старой цели названий нет', 'NULL', (select coalesce(step_names::text, 'NULL') from goals where id = g1));
  perform pg_temp.as_user(a);
  update goals set step_names = '["Смета","","Покраска"]'::jsonb where id = g1;
  reset role;
  perform pg_temp.check_('2 названия записываются', '["Смета", "", "Покраска"]', (select step_names::text from goals where id = g1));
  perform pg_temp.check_('3 позиция сохраняется (2-й пустой)', '', (select step_names->>1 from goals where id = g1));
  perform pg_temp.as_user(b);
  update goals set step_names = '["Чужое"]'::jsonb where id = g1;
  reset role;
  perform pg_temp.check_('4 чужую цель изменить нельзя', '["Смета", "", "Покраска"]', (select step_names::text from goals where id = g1));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
