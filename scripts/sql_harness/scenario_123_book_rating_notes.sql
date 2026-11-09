-- Сценарий для run.sh 123: оценка и заметка книги (миграция 123, BACKLOG 77.8). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
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
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); k1 uuid; code text;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into books(user_id, title) values (a, 'Старая книга') returning id into k1;
  perform pg_temp.check_('1 у старой книги оценки и заметки нет', 'NULL|NULL', (select coalesce(rating::text, 'NULL') || '|' || coalesce(notes, 'NULL') from books where id = k1));
  perform pg_temp.as_user(a);
  update books set rating = 4, notes = 'Цитата' where id = k1;
  reset role;
  perform pg_temp.check_('2 значения записываются', '4|Цитата', (select rating::text || '|' || notes from books where id = k1));
  begin update books set rating = 0 where id = k1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('3 оценка 0 запрещена', 'check', code);
  begin update books set rating = 6 where id = k1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('4 оценка 6 запрещена', 'check', code);
  update books set rating = null where id = k1;
  perform pg_temp.check_('5 сброс оценки в NULL', 'NULL', (select coalesce(rating::text, 'NULL') from books where id = k1));
  perform pg_temp.as_user(b);
  update books set notes = 'чужое' where id = k1;
  reset role;
  perform pg_temp.check_('6 чужую книгу изменить нельзя', 'Цитата', (select notes from books where id = k1));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
