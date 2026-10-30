-- Сценарий для run.sh 113: «Тренировки» v2 — сессии, рутины, порядок/суперсеты (BACKLOG 69.1). Строки OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant select, insert, update, delete on workout_sessions, workout_routines, workout_routine_items, workout_exercises, workout_entries to authenticated;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;
create or replace function pg_temp.try_(p_sql text) returns text as $$
begin execute p_sql; return ''; exception when others then return sqlstate; end $$ language plpgsql;
create or replace function pg_temp.as_client(u uuid) returns void as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  ex_a uuid := gen_random_uuid(); ex_b uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid(); s3 uuid := gen_random_uuid();
  r_a uuid := gen_random_uuid(); r_b uuid := gen_random_uuid(); en uuid := gen_random_uuid();
  t0 timestamptz; t1 timestamptz; k int; e text;
begin
  insert into auth.users(id) values (a), (b);
  insert into workout_exercises(id, user_id, name) values (ex_a, a, 'Жим'), (ex_b, b, 'Присед');
  -- сессии
  perform pg_temp.check_('01 идущая сессия создаётся', '', pg_temp.try_(format($q$insert into workout_sessions(id, user_id, date, started_at) values (%L, %L, current_date, now())$q$, s1, a)));
  perform pg_temp.check_('02 вторая идущая у того же пользователя — 23505', '23505', pg_temp.try_(format($q$insert into workout_sessions(user_id, date, started_at) values (%L, current_date, now())$q$, a)));
  perform pg_temp.check_('03 у другого пользователя идущая своя', '', pg_temp.try_(format($q$insert into workout_sessions(user_id, date, started_at) values (%L, current_date, now())$q$, b)));
  update workout_sessions set finished_at = now() + interval '1 hour' where id = s1;
  perform pg_temp.check_('04 после завершения можно начать новую', '', pg_temp.try_(format($q$insert into workout_sessions(id, user_id, date, started_at) values (%L, %L, current_date, now())$q$, s2, a)));
  perform pg_temp.check_('05 конец раньше начала — 23514', '23514', pg_temp.try_(format($q$insert into workout_sessions(user_id, date, started_at, finished_at) values (%L, current_date, now(), now() - interval '1 hour')$q$, a)));
  perform pg_temp.check_('06 manual без конца — 23514', '23514', pg_temp.try_(format($q$insert into workout_sessions(user_id, date, started_at, source) values (%L, current_date, now(), 'manual')$q$, a)));
  perform pg_temp.check_('07 manual задним числом с концом принимается', '', pg_temp.try_(format($q$insert into workout_sessions(id, user_id, date, started_at, finished_at, source) values (%L, %L, current_date - 3, now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 'manual')$q$, s3, a)));
  perform pg_temp.check_('08 неизвестный source — 23514', '23514', pg_temp.try_(format($q$insert into workout_sessions(user_id, date, started_at, finished_at, source) values (%L, current_date, now(), now(), 'x')$q$, a)));
  perform pg_temp.check_('09 пустое название — 23514', '23514', pg_temp.try_(format($q$insert into workout_sessions(user_id, date, started_at, finished_at, name) values (%L, current_date, now(), now(), '  ')$q$, a)));
  -- updated_at
  -- now() в одной транзакции постоянен, поэтому пробуем «затереть» updated_at: триггер обязан вернуть текущее время
  update workout_sessions set name = 'Грудь', updated_at = '2000-01-01' where id = s2;
  select updated_at into t1 from workout_sessions where id = s2;
  perform pg_temp.check_('10 триггер обновляет updated_at', 'true', (t1 > '2020-01-01')::text);
  -- рутины
  insert into workout_routines(id, user_id, name) values (r_a, a, 'Push'), (r_b, b, 'Legs');
  perform pg_temp.check_('11 пункт рутины со своим упражнением', '', pg_temp.try_(format($q$insert into workout_routine_items(user_id, routine_id, exercise_id, target_sets, reps_min, reps_max) values (%L, %L, %L, 3, 8, 12)$q$, a, r_a, ex_a)));
  perform pg_temp.check_('12 reps_max < reps_min — 23514', '23514', pg_temp.try_(format($q$insert into workout_routine_items(user_id, routine_id, exercise_id, reps_min, reps_max) values (%L, %L, %L, 10, 5)$q$, a, r_a, ex_a)));
  perform pg_temp.check_('13 target_sets = 0 — 23514', '23514', pg_temp.try_(format($q$insert into workout_routine_items(user_id, routine_id, exercise_id, target_sets) values (%L, %L, %L, 0)$q$, a, r_a, ex_a)));
  perform pg_temp.check_('14 пустое название рутины — 23514', '23514', pg_temp.try_(format($q$insert into workout_routines(user_id, name) values (%L, ' ')$q$, a)));
  -- записи: сессия, порядок, суперсет
  insert into workout_entries(id, user_id, exercise_id, date, sets, session_id, position, superset_group)
    values (en, a, ex_a, current_date, '[{"reps":5,"weight":60,"type":"warmup"}]'::jsonb, s2, 0, 1);
  perform pg_temp.check_('15 запись привязана к сессии', '1', (select count(*)::text from workout_entries where session_id = s2));
  perform pg_temp.check_('16 superset_group = 21 — 23514', '23514', pg_temp.try_(format($q$update workout_entries set superset_group = 21 where id = %L$q$, en)));
  perform pg_temp.check_('17 position < 0 — 23514', '23514', pg_temp.try_(format($q$update workout_entries set position = -1 where id = %L$q$, en)));
  -- RLS
  perform pg_temp.check_('18 RLS включён на трёх таблицах', '3', (select count(*)::text from pg_class where relname in ('workout_sessions','workout_routines','workout_routine_items') and relrowsecurity));
  perform pg_temp.as_client(b);
  set local role authenticated;
  select count(*) into k from workout_sessions where user_id = a;
  e := '';
  begin insert into workout_sessions(user_id, date, started_at, finished_at) values (a, current_date, now(), now()); exception when others then e := sqlstate; end;
  reset role;
  perform pg_temp.check_('19 чужие сессии не видны', '0', k::text);
  perform pg_temp.check_('20 вставка сессии за другого — 42501', '42501', e);
  perform pg_temp.as_client(b);
  set local role authenticated;
  e := '';
  begin insert into workout_routine_items(user_id, routine_id, exercise_id) values (b, r_a, ex_b); exception when others then e := sqlstate; end;
  reset role;
  perform pg_temp.check_('21 пункт в чужую рутину — 42501', '42501', e);
  perform pg_temp.as_client(b);
  set local role authenticated;
  e := '';
  begin insert into workout_routine_items(user_id, routine_id, exercise_id) values (b, r_b, ex_a); exception when others then e := sqlstate; end;
  reset role;
  perform pg_temp.check_('22 пункт с чужим упражнением — 42501', '42501', e);
  perform pg_temp.as_client(b);
  set local role authenticated;
  e := '';
  begin insert into workout_sessions(user_id, date, started_at, finished_at, routine_id) values (b, current_date, now(), now(), r_a); exception when others then e := sqlstate; end;
  reset role;
  perform pg_temp.check_('23 сессия с чужой рутиной — 42501', '42501', e);
  -- каскады
  delete from workout_sessions where id = s2;
  perform pg_temp.check_('24 удаление сессии не удаляет записи', '1', (select count(*)::text from workout_entries where id = en));
  perform pg_temp.check_('25 у записи session_id стал NULL', 'true', (select (session_id is null)::text from workout_entries where id = en));
  delete from workout_routines where id = r_a;
  perform pg_temp.check_('26 удаление рутины убирает её пункты', '0', (select count(*)::text from workout_routine_items where routine_id = r_a));
  delete from auth.users where id = a;
  perform pg_temp.check_('27 каскад по пользователю: сессии', '0', (select count(*)::text from workout_sessions where user_id = a));
  perform pg_temp.check_('28 колонка profiles.workout_settings есть', '1', (select count(*)::text from information_schema.columns where table_name = 'profiles' and column_name = 'workout_settings'));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
