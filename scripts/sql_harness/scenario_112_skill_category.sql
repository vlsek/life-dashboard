-- Сценарий для run.sh 112: категория навыка (миграция 112, BACKLOG 44.4 срез 2). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
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
  s1 uuid; code text;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  -- старая строка без категории остаётся валидной
  insert into skills(user_id, name) values (a, 'Старый навык') returning id into s1;
  perform pg_temp.check_('1 старая строка: категория NULL', 'NULL', (select coalesce(category, 'NULL') from skills where id = s1));

  perform pg_temp.as_user(a);
  update skills set category = 'Спорт' where id = s1;
  reset role;
  perform pg_temp.check_('2 категория записывается', 'Спорт', (select category from skills where id = s1));

  begin update skills set category = '' where id = s1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('3 пустая строка запрещена', 'check', code);
  begin update skills set category = ' Спорт' where id = s1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('4 пробелы по краям запрещены', 'check', code);
  begin update skills set category = repeat('я', 41) where id = s1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('5 длина 41 запрещена', 'check', code);
  update skills set category = repeat('я', 40) where id = s1;
  perform pg_temp.check_('6 длина 40 разрешена', '40', (select char_length(category)::text from skills where id = s1));
  update skills set category = null where id = s1;
  perform pg_temp.check_('7 сброс в NULL', 'NULL', (select coalesce(category, 'NULL') from skills where id = s1));

  -- чужой навык изменить нельзя (RLS как раньше)
  perform pg_temp.as_user(b);
  update skills set category = 'Взлом' where id = s1;
  reset role;
  perform pg_temp.check_('8 чужой навык не меняется', 'NULL', (select coalesce(category, 'NULL') from skills where id = s1));

  delete from auth.users where id = a;
  perform pg_temp.check_('9 каскад чистит навыки', '0', (select count(*) from skills where user_id = a)::text);
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
