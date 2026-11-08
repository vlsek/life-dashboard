-- Сценарий для run.sh 122: этапы навыка (миграция 122, BACKLOG 77.12). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
set ON_ERROR_STOP 1
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
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); s1 uuid;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into skills(user_id, name) values (a, 'Гитара') returning id into s1;
  perform pg_temp.check_('1 у старого навыка этапов нет', 'NULL', (select coalesce(checklist::text, 'NULL') from skills where id = s1));
  perform pg_temp.as_user(a);
  update skills set checklist = '[{"name":"Аккорды","done":true},{"name":"Бой","done":false}]'::jsonb where id = s1;
  reset role;
  perform pg_temp.check_('2 этапы записываются', '2', (select jsonb_array_length(checklist)::text from skills where id = s1));
  perform pg_temp.check_('3 флаг done хранится', 'true', (select (checklist->0->>'done') from skills where id = s1));
  perform pg_temp.as_user(b);
  update skills set checklist = '[]'::jsonb where id = s1;
  reset role;
  perform pg_temp.check_('4 чужой навык изменить нельзя', '2', (select jsonb_array_length(checklist)::text from skills where id = s1));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
