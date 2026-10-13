-- Сценарий для run.sh 085: цели на вес (миграция 085) + запись веса в body_stats (upsert). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant all on all tables in schema public to authenticated;
grant all on pg_temp.res to public;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); gid uuid; e text;
begin
  insert into auth.users(id) values (a);
  insert into goals(user_id, name) values (a, 'обычная') returning id into gid;
  perform pg_temp.check_('01 у существующей цели вес NULL', 'null|null|null',
    (select coalesce(weight_mode, 'null') || '|' || coalesce(weight_start::text, 'null') || '|' || coalesce(weight_target::text, 'null') from goals where id = gid));
  e := ''; begin insert into goals(user_id, name, weight_mode, weight_start, weight_target) values (a, 'сбросить', 'lose', 90, 80); exception when others then e := sqlstate; end;
  perform pg_temp.check_('02 lose 90→80 принимается', '', e);
  e := ''; begin insert into goals(user_id, name, weight_mode, weight_start, weight_target) values (a, 'набрать', 'gain', 60.5, 70); exception when others then e := sqlstate; end;
  perform pg_temp.check_('03 gain 60,5→70 принимается', '', e);
  e := ''; begin insert into goals(user_id, name, weight_mode, weight_start, weight_target) values (a, 'x', 'lose', 80, 90); exception when others then e := sqlstate; end;
  perform pg_temp.check_('04 lose с целью выше старта отклоняется (23514)', '23514', e);
  e := ''; begin insert into goals(user_id, name, weight_mode, weight_start, weight_target) values (a, 'x', 'gain', 80, 70); exception when others then e := sqlstate; end;
  perform pg_temp.check_('05 gain с целью ниже старта отклоняется (23514)', '23514', e);
  e := ''; begin insert into goals(user_id, name, weight_mode, weight_start) values (a, 'x', 'lose', 90); exception when others then e := sqlstate; end;
  perform pg_temp.check_('06 режим без целевого веса отклоняется (23514)', '23514', e);
  e := ''; begin insert into goals(user_id, name, weight_start, weight_target) values (a, 'x', 90, 80); exception when others then e := sqlstate; end;
  perform pg_temp.check_('07 числа без режима отклоняются (23514)', '23514', e);
  e := ''; begin insert into goals(user_id, name, weight_mode, weight_start, weight_target) values (a, 'x', 'lose', 90, 19); exception when others then e := sqlstate; end;
  perform pg_temp.check_('08 вес вне 20–500 отклоняется (23514)', '23514', e);
  e := ''; begin insert into goals(user_id, name, weight_mode, weight_start, weight_target) values (a, 'x', 'keep', 90, 80); exception when others then e := sqlstate; end;
  perform pg_temp.check_('09 неизвестный режим отклоняется (23514)', '23514', e);
  update goals set weight_mode = 'lose', weight_start = 90, weight_target = 85 where id = gid;
  perform pg_temp.check_('10 обычная цель становится весовой одним update', 'lose', (select weight_mode from goals where id = gid));
  update goals set weight_mode = null, weight_start = null, weight_target = null where id = gid;
  perform pg_temp.check_('11 и обратно в обычную', 'null', coalesce((select weight_mode from goals where id = gid), 'null'));
  -- вес из карточки цели: upsert в body_stats за сегодня трогает только weight
  insert into body_stats(user_id, date, weight, body_fat) values (a, current_date, 91, 20);
  insert into body_stats(user_id, date, weight) values (a, current_date, 89.5)
    on conflict (user_id, date) do update set weight = excluded.weight;
  perform pg_temp.check_('12 upsert веса обновляет вес', '89.5', (select weight::text from body_stats where user_id = a and date = current_date));
  perform pg_temp.check_('13 upsert веса не трогает body_fat', '20', (select body_fat::text from body_stats where user_id = a and date = current_date));
  perform pg_temp.check_('14 запись за день одна', '1', (select count(*)::text from body_stats where user_id = a and date = current_date));
end $$;

select pg_temp.check_('15 три новые колонки', '3', (select count(*)::text from information_schema.columns where table_name = 'goals' and column_name in ('weight_mode', 'weight_start', 'weight_target')));
select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
