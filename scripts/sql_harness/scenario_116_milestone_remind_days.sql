-- Сценарий для run.sh 116: «напомнить за N дней» у вехи (миграция 116, BACKLOG 76.6). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
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
  m1 uuid; code text;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x');
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');
  insert into milestones(user_id, name, due_date) values (a, 'Старая веха', current_date + 3) returning id into m1;
  perform pg_temp.check_('1 старая строка: remind_days NULL', 'NULL', (select coalesce(remind_days::text, 'NULL') from milestones where id = m1));

  perform pg_temp.as_user(a);
  update milestones set remind_days = 30 where id = m1;
  reset role;
  perform pg_temp.check_('2 значение записывается', '30', (select remind_days::text from milestones where id = m1));

  begin update milestones set remind_days = 0 where id = m1; code := 'ok'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('3 ноль разрешён', 'ok', code);
  begin update milestones set remind_days = -1 where id = m1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('4 отрицательное запрещено', 'check', code);
  begin update milestones set remind_days = 366 where id = m1; code := 'нет ошибки'; exception when check_violation then code := 'check'; end;
  perform pg_temp.check_('5 больше 365 запрещено', 'check', code);
  update milestones set remind_days = null where id = m1;
  perform pg_temp.check_('6 сброс в NULL', 'NULL', (select coalesce(remind_days::text, 'NULL') from milestones where id = m1));

  perform pg_temp.as_user(b);
  update milestones set remind_days = 99 where id = m1;
  reset role;
  perform pg_temp.check_('7 чужую веху изменить нельзя', 'NULL', (select coalesce(remind_days::text, 'NULL') from milestones where id = m1));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
