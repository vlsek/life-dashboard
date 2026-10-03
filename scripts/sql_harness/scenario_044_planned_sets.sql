-- Сценарий для scripts/sql_harness/run.sh: 32 случая баллов за день + 6 сценариев серий/лидерборда для правила «подходов в день по плану» (миграции 041/044).
-- Печатает строку на проверку: OK или РАСХОЖДЕНИЕ. Запускать ТОЛЬКО на тестовой БД стенда (создаёт пользователей/метрики), не в рабочей Supabase.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected int, pts_day int, pts_all int);
-- один пользователь + одна метрика + одно значение дня; считаем баллы за день и за всё время
create or replace function pg_temp.t(p_name text, p_type text, p_goal numeric, p_dir text, p_log jsonb, p_day date, p_val jsonb, p_expected int)
returns void as $$
declare u uuid := gen_random_uuid(); m uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (u);
  insert into profiles(user_id) values (u);
  insert into metrics(id, user_id, name, type, goal_value, goal_direction, planned_sets_log) values (m, u, 'm', p_type, p_goal, p_dir, p_log);
  insert into daily_values(user_id, date, metric_id, value) values (u, p_day, m, p_val);
  insert into res(name, expected, pts_day, pts_all) values (p_name, p_expected, calc_user_points_for_date(u, p_day), calc_user_points(u));
end $$ language plpgsql;

select pg_temp.t('01 до даты плана: один подход, старое правило', 'sets', 0, 'at_least', '[{"from":"2026-10-05","n":3}]', '2026-10-04', '[{"reps":10}]', 1);
select pg_temp.t('02 с даты плана: день старта, 1 подход', 'sets', 0, 'at_least', '[{"from":"2026-10-05","n":3}]', '2026-10-05', '[{"reps":10}]', 0);
select pg_temp.t('03 после даты плана: 1 подход', 'sets', 0, 'at_least', '[{"from":"2026-10-05","n":3}]', '2026-10-06', '[{"reps":10}]', 0);
select pg_temp.t('04 после даты плана: 3 подхода', 'sets', 0, 'at_least', '[{"from":"2026-10-05","n":3}]', '2026-10-07', '[{"reps":10},{"reps":10},{"reps":10}]', 1);
select pg_temp.t('05 план + объём: 3x20 при цели 50', 'sets', 50, 'at_least', '[{"from":"2026-10-01","n":3}]', '2026-10-09', '[{"reps":20},{"reps":20},{"reps":20}]', 1);
select pg_temp.t('06 план + объём: один подход 60 (подходов мало)', 'sets', 50, 'at_least', '[{"from":"2026-10-01","n":3}]', '2026-10-09', '[{"reps":60}]', 0);
select pg_temp.t('07 план + объём: 3x10 (объёма мало)', 'sets', 50, 'at_least', '[{"from":"2026-10-01","n":3}]', '2026-10-09', '[{"reps":10},{"reps":10},{"reps":10}]', 0);
select pg_temp.t('08 смена N 3->4: день до смены, 3 подхода', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":3},{"from":"2026-10-10","n":4}]', '2026-10-09', '[{"reps":1},{"reps":1},{"reps":1}]', 1);
select pg_temp.t('09 смена N 3->4: день смены, 3 подхода', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":3},{"from":"2026-10-10","n":4}]', '2026-10-10', '[{"reps":1},{"reps":1},{"reps":1}]', 0);
select pg_temp.t('10 параметр снят: день до снятия, 1 подход', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":3},{"from":"2026-10-20","n":null}]', '2026-10-19', '[{"reps":10}]', 0);
select pg_temp.t('11 параметр снят: день после снятия, 1 подход', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":3},{"from":"2026-10-20","n":null}]', '2026-10-21', '[{"reps":10}]', 1);
select pg_temp.t('12 тип number с журналом — игнор (7 >= 5)', 'number', 5, 'at_least', '[{"from":"2026-10-01","n":3}]', '2026-10-06', '7', 1);
select pg_temp.t('13 тип number с журналом — игнор (3 < 5)', 'number', 5, 'at_least', '[{"from":"2026-10-01","n":3}]', '2026-10-06', '3', 0);
select pg_temp.t('14 at_most + журнал — игнор (10 < 40)', 'sets', 40, 'at_most', '[{"from":"2026-10-01","n":5}]', '2026-10-06', '[{"reps":10}]', 1);
select pg_temp.t('15 at_most + журнал — игнор (50 > 40)', 'sets', 40, 'at_most', '[{"from":"2026-10-01","n":5}]', '2026-10-06', '[{"reps":50}]', 0);
select pg_temp.t('16 без журнала: старое правило (25 >= 20)', 'sets', 20, 'at_least', null, '2026-10-06', '[{"reps":25}]', 1);
select pg_temp.t('17 без журнала: старое правило (5 < 20)', 'sets', 20, 'at_least', null, '2026-10-06', '[{"reps":5}]', 0);
select pg_temp.t('18 мусор: журнал-строка', 'sets', 0, 'at_least', '"oops"', '2026-10-06', '[{"reps":10}]', 1);
select pg_temp.t('19 мусор: [null]', 'sets', 0, 'at_least', '[null]', '2026-10-06', '[{"reps":10}]', 1);
select pg_temp.t('20 мусор: from=bad', 'sets', 0, 'at_least', '[{"from":"bad","n":5}]', '2026-10-06', '[{"reps":10}]', 1);
select pg_temp.t('21 мусор: n=abc', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":"abc"}]', '2026-10-06', '[{"reps":10}]', 1);
select pg_temp.t('22 мусор: n=0', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":0}]', '2026-10-06', '[{"reps":10}]', 1);
select pg_temp.t('23 мусор: from=2026-13-45 (не дата, но формат ок)', 'sets', 0, 'at_least', '[{"from":"2026-13-45","n":5}]', '2026-10-06', '[{"reps":10}]', 1);
select pg_temp.t('24 подходы по времени: 2 из 3 записей считаются', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":2}]', '2026-10-06', '[{"time":"01:00"},{"time":"02:00"},{"reps":0}]', 1);
select pg_temp.t('25 подходы по времени: 1 из 2 записей', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":2}]', '2026-10-06', '[{"time":"01:00"},{"reps":0}]', 0);
select pg_temp.t('26 старое число вместо массива + план', 'sets', 50, 'at_least', '[{"from":"2026-10-01","n":2}]', '2026-10-06', '100', 0);
select pg_temp.t('27 старое число вместо массива без плана', 'sets', 50, 'at_least', null, '2026-10-06', '100', 1);
select pg_temp.t('28 одинаковые from: побеждает последняя запись (n=2)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":5},{"from":"2026-10-01","n":2}]', '2026-10-06', '[{"reps":10},{"reps":10}]', 1);
select pg_temp.t('29 цель не задана (null) + план 2: два подхода', 'sets', null, 'at_least', '[{"from":"2026-10-01","n":2}]', '2026-10-06', '[{"reps":5},{"reps":5}]', 1);
select pg_temp.t('30 цель не задана (null) + план 2: один подход', 'sets', null, 'at_least', '[{"from":"2026-10-01","n":2}]', '2026-10-06', '[{"reps":5}]', 0);
select pg_temp.t('31 значение null + план', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":2}]', '2026-10-06', null, 0);
select pg_temp.t('32 boolean с журналом — игнор', 'boolean', null, 'at_least', '[{"from":"2026-10-01","n":2}]', '2026-10-06', 'true', 1);

-- ===== серии и лидерборд (даты относительно сегодня) =====
create or replace function pg_temp.s(p_name text, p_log jsonb, p_days jsonb, p_expected_streak int, p_expected_pts int)
returns void as $$
declare u uuid := gen_random_uuid(); m uuid := gen_random_uuid(); cat uuid; k text; r record; e record; ps int;
begin
  select id into cat from metric_categories where key = 'pushups';
  insert into auth.users(id) values (u);
  insert into profiles(user_id) values (u);
  insert into metrics(id, user_id, name, type, goal_value, goal_direction, category_id, planned_sets_log)
    values (m, u, 'm', 'sets', 0, 'at_least', cat, replace(p_log::text, 'TODAY', '')::jsonb);
  for e in select * from jsonb_each(p_days) loop
    insert into daily_values(user_id, date, metric_id, value) values (u, current_date + (e.key)::int, m, e.value);
  end loop;
  select category_points into ps from get_category_leaderboard('pushups', 'all') where user_id = u;
  insert into res(name, expected, pts_day, pts_all)
    values (p_name || ' | серия общая', p_expected_streak, calc_perfect_streak(u), null),
           (p_name || ' | серия категории', p_expected_streak, calc_category_streak(u, 'pushups'), null),
           (p_name || ' | очки категории (лидерборд)', p_expected_pts, ps, null);
end $$ language plpgsql;

-- журнал начинается "сегодня-2" (дату подставляем снизу через to_char); значения: -5..-3 по одному подходу, -2/-1 по три
do $$
declare d2 text := to_char(current_date - 2, 'YYYY-MM-DD'); d1 text := to_char(current_date - 1, 'YYYY-MM-DD');
        one jsonb := '[{"reps":10}]'; three jsonb := '[{"reps":10},{"reps":10},{"reps":10}]';
begin
  perform pg_temp.s('S1 план с -2, дни -2/-1 по 3 подхода', ('[{"from":"'||d2||'","n":3}]')::jsonb,
    jsonb_build_object('-5', one, '-4', one, '-3', one, '-2', three, '-1', three), 5, 5);
  perform pg_temp.s('S2 план с -2, дни -2/-1 по 1 подходу', ('[{"from":"'||d2||'","n":3}]')::jsonb,
    jsonb_build_object('-5', one, '-4', one, '-3', one, '-2', one, '-1', one), 0, 3);
  perform pg_temp.s('S3 план с -1, вчера 3 подхода, раньше по 1', ('[{"from":"'||d1||'","n":3}]')::jsonb,
    jsonb_build_object('-5', one, '-4', one, '-3', one, '-2', one, '-1', three), 5, 5);
  perform pg_temp.s('S4 план с -1, вчера 1 подход', ('[{"from":"'||d1||'","n":3}]')::jsonb,
    jsonb_build_object('-5', one, '-4', one, '-3', one, '-2', one, '-1', one), 0, 4);
  perform pg_temp.s('S5 без журнала, везде по 1 подходу', 'null'::jsonb,
    jsonb_build_object('-5', one, '-4', one, '-3', one, '-2', one, '-1', one), 5, 5);
  perform pg_temp.s('S6 план с -3, -3/-2 по 1 подходу, -1 три: серия рвётся на -2', ('[{"from":"'||to_char(current_date - 3, 'YYYY-MM-DD')||'","n":3}]')::jsonb,
    jsonb_build_object('-4', one, '-3', one, '-2', one, '-1', three), 1, 2);
end $$;

select format('%-62s | ожидалось %s | за день %s | всего %s | %s', name, expected, coalesce(pts_day::text,'-'), coalesce(pts_all::text,'-'),
  case when pts_day = expected and (pts_all is null or pts_all = expected) then 'OK' else 'РАСХОЖДЕНИЕ' end)
from res order by n;
