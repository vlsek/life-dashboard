-- Сценарий для run.sh 086: горизонт «На неделю» (миграция 086). Строки OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); gid uuid; e text; v text;
begin
  insert into auth.users(id) values (a);
  -- прежние значения (084) продолжают приниматься
  for v in select unnest(array['now', 'soon', 'month', 'day']) loop
    e := '';
    begin insert into goals(user_id, name, horizon) values (a, 'h-' || v, v); exception when others then e := sqlstate; end;
    perform pg_temp.check_('01 horizon=' || v || ' по-прежнему принимается', '', e);
  end loop;
  -- новое значение
  e := '';
  begin insert into goals(user_id, name, horizon) values (a, 'h-week', 'week') returning id into gid; exception when others then e := sqlstate; end;
  perform pg_temp.check_('02 horizon=week принимается', '', e);
  perform pg_temp.check_('03 week записан', 'week', coalesce((select horizon from goals where id = gid), 'нет'));
  -- мусор по-прежнему отклоняется
  e := '';
  begin insert into goals(user_id, name, horizon) values (a, 'bad', 'weekly'); exception when others then e := sqlstate; end;
  perform pg_temp.check_('04 horizon=weekly отклоняется (23514)', '23514', e);
  -- имя ограничения то же (клиент по нему узнаёт, что нужна 086)
  perform pg_temp.check_('05 одно ограничение goals_horizon_check', '1', (select count(*)::text from pg_constraint where conname = 'goals_horizon_check' and conrelid = 'goals'::regclass));
  -- существующая цель с NULL не затронута
  insert into goals(user_id, name) values (a, 'без горизонта') returning id into gid;
  perform pg_temp.check_('06 NULL остаётся NULL', 'null', coalesce((select horizon from goals where id = gid), 'null'));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
