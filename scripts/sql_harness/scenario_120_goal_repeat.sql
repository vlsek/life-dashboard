-- Сценарий для run.sh 120: повтор цели (миграция 120, BACKLOG 81.4). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
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
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  g1 uuid; g2 uuid; code text;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into goals(user_id, name) values (a, 'Старая цель') returning id into g1;
  perform pg_temp.check_('1 у старой цели повтора нет', 'NULL', (select coalesce(repeat_every, 'NULL') from goals where id = g1));

  perform pg_temp.as_user(a);
  update goals set repeat_every = 'month' where id = g1;
  reset role;
  perform pg_temp.check_('2 month записывается', 'month', (select repeat_every from goals where id = g1));
  begin update goals set repeat_every = 'week' where id = g1; code := 'ok'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('3 week разрешён', 'ok', code);
  begin update goals set repeat_every = 'year' where id = g1; code := 'ok'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('4 year разрешён', 'ok', code);
  begin update goals set repeat_every = 'day' where id = g1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('5 другое значение запрещено', 'check', code);

  insert into goals(user_id, name, repeat_every) values (a, 'Следующая', 'year') returning id into g2;
  update goals set repeat_next_id = g2 where id = g1;
  perform pg_temp.check_('6 ссылка на следующую хранится', g2::text, (select repeat_next_id::text from goals where id = g1));
  delete from goals where id = g2;
  perform pg_temp.check_('7 удаление следующей не мешает (без внешнего ключа)', '0', (select count(*)::text from goals where id = g2));
  update goals set repeat_every = null, repeat_next_id = null where id = g1;
  perform pg_temp.check_('8 сброс в NULL', 'NULL', (select coalesce(repeat_every, 'NULL') from goals where id = g1));

  perform pg_temp.as_user(b);
  update goals set repeat_every = 'week' where id = g1;
  reset role;
  perform pg_temp.check_('9 чужую цель изменить нельзя', 'NULL', (select coalesce(repeat_every, 'NULL') from goals where id = g1));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
