-- Сценарий для run.sh 084: горизонт цели (миграция 084). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant all on all tables in schema public to authenticated;
grant all on pg_temp.res to public;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); gid uuid; e text; v text;
begin
  insert into auth.users(id) values (a);
  -- старая цель (до 084): колонка есть, значение NULL
  insert into goals(user_id, name, deadline) values (a, 'старая', current_date + 3) returning id into gid;
  perform pg_temp.check_('01 у существующей цели horizon NULL', 'null', coalesce((select horizon from goals where id = gid), 'null'));
  -- допустимые значения
  for v in select unnest(array['now', 'soon', 'month', 'day']) loop
    e := '';
    begin insert into goals(user_id, name, horizon) values (a, 'h-' || v, v); exception when others then e := sqlstate; end;
    perform pg_temp.check_('02 horizon=' || v || ' принимается', '', e);
  end loop;
  -- недопустимое значение
  e := '';
  begin insert into goals(user_id, name, horizon) values (a, 'bad', 'week'); exception when others then e := sqlstate; end;
  perform pg_temp.check_('03 horizon=week отклоняется (23514)', '23514', e);
  -- NULL допустим, обновление горизонта у цели
  update goals set horizon = 'soon' where id = gid;
  perform pg_temp.check_('04 update horizon', 'soon', (select horizon from goals where id = gid));
  update goals set horizon = null where id = gid;
  perform pg_temp.check_('05 сброс в NULL', 'null', coalesce((select horizon from goals where id = gid), 'null'));
  -- срок и горизонт независимы
  perform pg_temp.check_('06 deadline не тронут', (current_date + 3)::text, (select deadline::text from goals where id = gid));
end $$;

-- повторный запуск миграции безопасен (в сценарии не повторяем: run.sh уже применил 084 один раз; ниже — второй раз вручную)
select pg_temp.check_('07 колонка horizon одна', '1', (select count(*)::text from information_schema.columns where table_name = 'goals' and column_name = 'horizon'));
select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
