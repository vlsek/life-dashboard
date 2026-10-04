-- Сценарий для scripts/sql_harness/run.sh: дробные баллы за подходы (миграция 045; BACKLOG 13). Печатает строки: OK или РАСХОЖДЕНИЕ.
-- Запускать ТОЛЬКО на тестовой БД стенда (создаёт пользователей/метрики), не в рабочей Supabase.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected numeric, pts_day numeric);

create or replace function pg_temp.t(p_name text, p_type text, p_goal numeric, p_dir text, p_log jsonb, p_day date, p_val jsonb, p_expected numeric)
returns void as $$
declare u uuid := gen_random_uuid(); m uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (u);
  insert into profiles(user_id) values (u);
  insert into metrics(id, user_id, name, type, goal_value, goal_direction, planned_sets_log) values (m, u, 'm', p_type, p_goal, p_dir, p_log);
  insert into daily_values(user_id, date, metric_id, value) values (u, p_day, m, p_val);
  insert into res(name, expected, pts_day) values (p_name, p_expected, calc_user_points_for_date(u, p_day));
end $$ language plpgsql;

-- журнал: с 1 октября N подходов, флаг frac (дробные баллы). Значения — по 10 повторов в подходе.
select pg_temp.t('01 N=4: 1 подход -> 0,3 (0,25 округляется вверх)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"reps":10}]', 0.3);
select pg_temp.t('02 N=4: 2 подхода -> 0,5', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"reps":10},{"reps":10}]', 0.5);
select pg_temp.t('03 N=4: 3 подхода -> 0,8 (0,75 вверх)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"reps":10},{"reps":10},{"reps":10}]', 0.8);
select pg_temp.t('04 N=4: 4 подхода -> выполнено, 1', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"reps":10},{"reps":10},{"reps":10},{"reps":10}]', 1);
select pg_temp.t('05 N=4: 6 подходов (сверх плана) -> 1, не больше', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"reps":1},{"reps":1},{"reps":1},{"reps":1},{"reps":1},{"reps":1}]', 1);
select pg_temp.t('06 N=4: пустой массив -> 0', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[]', 0);
select pg_temp.t('07 N=3: 1 подход -> 0,3 (0,333)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":3,"frac":true}]', '2026-10-05', '[{"reps":10}]', 0.3);
select pg_temp.t('08 N=3: 2 подхода -> 0,7 (0,667)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":3,"frac":true}]', '2026-10-05', '[{"reps":10},{"reps":10}]', 0.7);
select pg_temp.t('09 N=2: 1 подход -> 0,5', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":2,"frac":true}]', '2026-10-05', '[{"reps":10}]', 0.5);
select pg_temp.t('10 N=7: 1 подход -> 0,1 (0,143)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":7,"frac":true}]', '2026-10-05', '[{"reps":10}]', 0.1);
select pg_temp.t('11 N=20: 19 подходов -> потолок 0,9 (0,95 не округляется до 1)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":20,"frac":true}]', '2026-10-05',
  (select jsonb_agg(jsonb_build_object('reps', 1)) from generate_series(1,19)), 0.9);
select pg_temp.t('12 N=3, объём 50: три подхода по 10 (объёма мало) -> потолок 0,9', 'sets', 50, 'at_least', '[{"from":"2026-10-01","n":3,"frac":true}]', '2026-10-05', '[{"reps":10},{"reps":10},{"reps":10}]', 0.9);
select pg_temp.t('13 N=3, объём 50: три подхода по 20 -> выполнено, 1', 'sets', 50, 'at_least', '[{"from":"2026-10-01","n":3,"frac":true}]', '2026-10-05', '[{"reps":20},{"reps":20},{"reps":20}]', 1);
select pg_temp.t('14 запись БЕЗ frac (старый журнал 041/044): как раньше, 1 из 4 -> 0', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4}]', '2026-10-05', '[{"reps":10}]', 0);
select pg_temp.t('15 frac=false: как раньше -> 0', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":false}]', '2026-10-05', '[{"reps":10}]', 0);
select pg_temp.t('16 frac как строка "true" — не считается флагом -> 0', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":"true"}]', '2026-10-05', '[{"reps":10}]', 0);
select pg_temp.t('17 день ДО записи журнала: старое правило -> 1 подход при цели 0 = выполнено', 'sets', 0, 'at_least', '[{"from":"2026-10-10","n":4,"frac":true}]', '2026-10-05', '[{"reps":10}]', 1);
select pg_temp.t('18 день записи журнала: уже дробно (0,3)', 'sets', 0, 'at_least', '[{"from":"2026-10-10","n":4,"frac":true}]', '2026-10-10', '[{"reps":10}]', 0.3);
select pg_temp.t('19 старая запись без frac, потом новая с frac: до новой — по-старому', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4},{"from":"2026-10-10","n":4,"frac":true}]', '2026-10-09', '[{"reps":10}]', 0);
select pg_temp.t('20 старая запись без frac, потом новая с frac: с новой — дробно', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4},{"from":"2026-10-10","n":4,"frac":true}]', '2026-10-10', '[{"reps":10}]', 0.3);
select pg_temp.t('21 смена N 4->2 (обе с frac): до смены 1 подход = 0,3', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true},{"from":"2026-10-10","n":2,"frac":true}]', '2026-10-09', '[{"reps":10}]', 0.3);
select pg_temp.t('22 смена N 4->2 (обе с frac): после смены 1 подход = 0,5', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true},{"from":"2026-10-10","n":2,"frac":true}]', '2026-10-10', '[{"reps":10}]', 0.5);
select pg_temp.t('23 параметр снят (n=null): дробных нет, старое правило (1 подход при цели 0 = 1)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true},{"from":"2026-10-20","n":null}]', '2026-10-21', '[{"reps":10}]', 1);
select pg_temp.t('24 тип number с frac-журналом — игнор (3 < 5)', 'number', 5, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '3', 0);
select pg_temp.t('25 at_most + frac-журнал — игнор (10 < 40 = выполнено)', 'sets', 40, 'at_most', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"reps":10}]', 1);
select pg_temp.t('26 at_most + frac-журнал — игнор (50 > 40 = нет, без долей)', 'sets', 40, 'at_most', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"reps":50}]', 0);
select pg_temp.t('27 boolean с frac-журналом — игнор', 'boolean', null, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', 'true', 1);
select pg_temp.t('28 без журнала, 1 подход при цели 20 — 0 (как раньше)', 'sets', 20, 'at_least', null, '2026-10-05', '[{"reps":5}]', 0);
select pg_temp.t('29 подходы по времени: 2 из 4 -> 0,5', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '[{"time":"01:00"},{"time":"02:00"},{"reps":0}]', 0.5);
select pg_temp.t('30 старое число вместо массива + frac-план -> 0', 'sets', 50, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', '30', 0);
select pg_temp.t('31 значение null + frac-план -> 0', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4,"frac":true}]', '2026-10-05', null, 0);
select pg_temp.t('32 мусор: n=abc с frac -> как раньше (1 подход при цели 0 = 1)', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":"abc","frac":true}]', '2026-10-05', '[{"reps":10}]', 1);
select pg_temp.t('33 одинаковые from: побеждает нижняя запись (с frac, N=2): 1 подход -> 0,5', 'sets', 0, 'at_least', '[{"from":"2026-10-01","n":4},{"from":"2026-10-01","n":2,"frac":true}]', '2026-10-05', '[{"reps":10}]', 0.5);

-- ===== сетка: metric_partial_points == round-half-up(10*подходов/N), потолок 9 (независимая формула на numeric), N=1..25, подходов 0..N-1 =====
do $$
declare bad int := 0; total int := 0; cnt int; nn int; got numeric; want numeric; v jsonb;
begin
  for nn in 1..25 loop
    for cnt in 0..(nn - 1) loop
      v := coalesce((select jsonb_agg(jsonb_build_object('reps', 1)) from generate_series(1, cnt)), '[]'::jsonb);
      got := metric_partial_points('sets', jsonb_build_array(jsonb_build_object('from', '2026-10-01', 'n', nn, 'frac', true)), v, date '2026-10-05');
      want := least(9, floor(10::numeric * cnt / nn + 0.5)) / 10;
      total := total + 1;
      if got <> want then bad := bad + 1; raise notice 'сетка: N=% подходов=% получено % ожидалось %', nn, cnt, got, want; end if;
    end loop;
  end loop;
  insert into res(name, expected, pts_day) values ('34 сетка формулы: ' || total || ' пар (N=1..25), расхождений ' || bad, 0, bad);
end $$;

-- ===== пользовательский уровень: пять функций после смены типа на numeric =====
do $$
declare u uuid := gen_random_uuid(); m uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); cat uuid; td date;
        pts numeric; lb numeric; ta numeric; cp numeric; per numeric; per_year numeric;
begin
  select id into cat from metric_categories where key = 'pushups';
  insert into auth.users(id) values (u), (u2);
  insert into profiles(user_id) values (u), (u2);
  td := user_today(u);
  insert into metrics(id, user_id, name, type, goal_value, goal_direction, category_id, planned_sets_log)
    values (m, u, 'Отжимания', 'sets', 0, 'at_least', cat, jsonb_build_array(jsonb_build_object('from', to_char(td - 5, 'YYYY-MM-DD'), 'n', 4, 'frac', true)));
  -- вчера 2 подхода (0,5), сегодня 1 подход (0,3), позавчера 4 подхода (1)
  insert into daily_values(user_id, date, metric_id, value) values
    (u, td - 2, m, '[{"reps":10},{"reps":10},{"reps":10},{"reps":10}]'),
    (u, td - 1, m, '[{"reps":10},{"reps":10}]'),
    (u, td,     m, '[{"reps":10}]');
  pts := calc_user_points(u);
  select total_points into lb from get_leaderboard() where user_id = u;
  select today_points into ta from get_today_activity() where user_id = u;
  select category_points into cp from get_category_leaderboard('pushups', 'all') where user_id = u;
  select total_points into per from get_leaderboard_period('all') where user_id = u;
  insert into res(name, expected, pts_day) values
    ('35 calc_user_points за всё время: 1 + 0,5 + 0,3', 1.8, pts),
    ('36 get_leaderboard.total_points', 1.8, lb),
    ('37 get_today_activity.today_points (сегодня 1 подход)', 0.3, ta),
    ('38 get_category_leaderboard.category_points', 1.8, cp),
    ('39 get_leaderboard_period(all) — 046 не сломана сменой типа', 1.8, per),
    ('40 calc_user_points_for_date(вчера)', 0.5, calc_user_points_for_date(u, td - 1));
  -- неделя: те же три дня попадают в текущую неделю не обязательно; проверяем только что функция работает и не превышает всё время
  select total_points into per from get_leaderboard_period('week') where user_id = u;
  insert into res(name, expected, pts_day) values ('41 get_leaderboard_period(week) <= всё время и кратно 0,1', 1, (per <= 1.8 and round(per, 1) = per)::int);
  -- цели/навыки/книги остаются целыми и складываются с дробными
  insert into goals(user_id, name, done, points) values (u, 'g', true, 5);
  insert into res(name, expected, pts_day) values ('42 цель +5 к дробным баллам: 1,8 + 5', 6.8, calc_user_points(u));
end $$;

select format('%-78s | ожидалось %s | получено %s | %s', name, expected, coalesce(pts_day::text,'-'),
  case when pts_day = expected then 'OK' else 'РАСХОЖДЕНИЕ' end)
from res order by n;
