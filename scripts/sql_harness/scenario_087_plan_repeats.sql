-- Сценарий для run.sh 087: таблица plan_repeats (повторяющиеся пункты плана). Строки OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;
create or replace function pg_temp.try_(p_sql text) returns text as $$
begin execute p_sql; return ''; exception when others then return sqlstate; end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); n int;
begin
  insert into auth.users(id) values (a), (b);
  perform pg_temp.check_('01 каждый день (schedule NULL)', '', pg_temp.try_(format($q$insert into plan_repeats(user_id, text) values (%L, 'Зарядка')$q$, a)));
  perform pg_temp.check_('02 по дням недели', '', pg_temp.try_(format($q$insert into plan_repeats(user_id, text, schedule) values (%L, 'Йога', '{"type":"days","days":[1,3,5]}')$q$, a)));
  perform pg_temp.check_('03 N раз в неделю + время', '', pg_temp.try_(format($q$insert into plan_repeats(user_id, text, time, schedule) values (%L, 'Бег', '07:30', '{"type":"weekly","min":3}')$q$, a)));
  perform pg_temp.check_('04 пустое название отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_repeats(user_id, text) values (%L, '   ')$q$, a)));
  perform pg_temp.check_('05 название длиннее 120 отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_repeats(user_id, text) values (%L, repeat('я', 121))$q$, a)));
  perform pg_temp.check_('06 время 25:00 отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_repeats(user_id, text, time) values (%L, 'X', '25:00')$q$, a)));
  perform pg_temp.check_('07 расписание неизвестного типа отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_repeats(user_id, text, schedule) values (%L, 'X', '{"type":"at_most","max":2}')$q$, a)));
  perform pg_temp.check_('08 weekly.min = 8 отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_repeats(user_id, text, schedule) values (%L, 'X', '{"type":"weekly","min":8}')$q$, a)));
  perform pg_temp.check_('09 days не массив отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_repeats(user_id, text, schedule) values (%L, 'X', '{"type":"days","days":"1"}')$q$, a)));
  select count(*) into n from plan_repeats where user_id = a;
  perform pg_temp.check_('10 у пользователя три корректные строки', '3', n::text);
  -- RLS включён и политика одна
  perform pg_temp.check_('11 RLS включён', 'true', (select relrowsecurity::text from pg_class where relname = 'plan_repeats'));
  perform pg_temp.check_('12 одна политика own plan_repeats', '1', (select count(*)::text from pg_policies where tablename = 'plan_repeats' and policyname = 'own plan_repeats'));
  -- удаление пользователя каскадно чистит строки
  delete from auth.users where id = a;
  perform pg_temp.check_('13 каскад по удалению пользователя', '0', (select count(*)::text from plan_repeats where user_id = a));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
