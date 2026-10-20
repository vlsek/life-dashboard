-- Сценарий для run.sh 103: офлайн-очередь (BACKLOG 66.2). Повторная и ПОЗДНЯЯ отправка записей не даёт двойных баллов и не сдвигает дни;
-- порядок доставки не важен; частичный upsert заметки не затирает planned_goals; повторная вставка с тем же uuid = 23505 (очередь считает «уже применено»).
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);

create function pg_temp.mk_user() returns uuid as $$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (u);
  insert into profiles(user_id) values (u);
  return u;
end $$ language plpgsql;

create function pg_temp.mk_metric(u uuid) returns uuid as $$
declare m uuid := gen_random_uuid();
begin
  insert into metrics(id, user_id, name, type, active) values (m, u, 'm', 'boolean', true);
  return m;
end $$ language plpgsql;

-- ровно то, что шлёт клиент: upsert по (user_id, date, metric_id)
create function pg_temp.put(u uuid, m uuid, d date, v jsonb) returns void as $$
begin
  insert into daily_values(user_id, date, metric_id, value) values (u, d, m, v)
  on conflict (user_id, date, metric_id) do update set value = excluded.value;
end $$ language plpgsql;

do $$
declare
  u uuid; t date; m uuid; m2 uuid; p1 numeric; p2 numeric; s1 int; s2 int; rej int; goals jsonb; n int;
begin
  u := pg_temp.mk_user(); t := user_today(u); m := pg_temp.mk_metric(u);

  -- A. повторная отправка той же записи: баллы те же, строка одна
  perform pg_temp.put(u, m, t, 'true');
  p1 := calc_user_points(u);
  perform pg_temp.put(u, m, t, 'true'); perform pg_temp.put(u, m, t, 'true');
  p2 := calc_user_points(u);
  insert into res values ('A1 три одинаковые отправки: баллы как после одной', p1, p2);
  select count(*) into n from daily_values where user_id = u;
  insert into res values ('A2 строка одна (дублей нет)', 1, n);

  -- B. поздняя отправка: офлайн-день неделю назад уходит сегодня — балл остаётся в ТОМ дне
  perform pg_temp.put(u, m, t - 7, 'true');
  insert into res values ('B1 балл за день недельной давности записан в этот день', 1, calc_user_points_for_date(u, t - 7));
  insert into res values ('B2 сегодняшний день не получил чужой балл', 1, calc_user_points_for_date(u, t));
  insert into res values ('B3 день без записей по-прежнему 0', 0, calc_user_points_for_date(u, t - 3));

  -- C. порядок доставки: «включил → выключил» и наоборот приходят в разном порядке, итог = последняя применённая запись
  perform pg_temp.put(u, m, t - 1, 'true'); perform pg_temp.put(u, m, t - 1, 'false');
  insert into res values ('C1 последним пришло false: балла за день нет', 0, calc_user_points_for_date(u, t - 1));
  perform pg_temp.put(u, m, t - 1, 'true');
  insert into res values ('C2 последним пришло true: балл есть', 1, calc_user_points_for_date(u, t - 1));

  -- D. серия считается по датам записей, а не по моменту отправки: дни t-2, t-1 доставлены позже, чем t — серия цельная
  m2 := pg_temp.mk_metric(u); -- вторая метрика: «идеальный день» требует обе
  perform pg_temp.put(u, m2, t, 'true'); perform pg_temp.put(u, m2, t - 1, 'true');
  s1 := calc_perfect_streak(u);
  perform pg_temp.put(u, m, t - 2, 'true'); perform pg_temp.put(u, m2, t - 2, 'true');
  s2 := calc_perfect_streak(u);
  insert into res values ('D1 до доставки позавчерашнего дня серия 2 (вчера, сегодня)', 2, s1);
  insert into res values ('D2 после поздней доставки позавчера серия 3', 3, s2);
  perform pg_temp.put(u, m, t - 2, 'true'); perform pg_temp.put(u, m2, t - 2, 'true'); -- повтор
  insert into res values ('D3 повторная доставка серию не меняет', 3, calc_perfect_streak(u));

  -- E. заметка дня: upsert только items не затирает planned_goals
  insert into daily_notes(user_id, date, items, planned_goals) values (u, t, '["a"]'::jsonb, '[{"text":"план"}]'::jsonb);
  insert into daily_notes(user_id, date, items) values (u, t, '["a","b"]'::jsonb)
    on conflict (user_id, date) do update set items = excluded.items;
  select planned_goals into goals from daily_notes where user_id = u and date = t;
  insert into res values ('E1 planned_goals сохранились после upsert items', 1, jsonb_array_length(goals));
  select jsonb_array_length(items) into n from daily_notes where user_id = u and date = t;
  insert into res values ('E2 items обновились', 2, n);
  -- заметка за день, где строки ещё не было: вставка даёт planned_goals по умолчанию
  insert into daily_notes(user_id, date, items) values (u, t - 4, '["x"]'::jsonb)
    on conflict (user_id, date) do update set items = excluded.items;
  select jsonb_array_length(planned_goals) into n from daily_notes where user_id = u and date = t - 4;
  insert into res values ('E3 новая строка заметки: planned_goals = пустой массив', 0, n);

  -- F. значения параметров тела: повторный upsert не плодит строки
  declare bp uuid := gen_random_uuid();
  begin
    insert into body_parameters(id, user_id, name) values (bp, u, 'вес');
    insert into body_parameter_values(user_id, date, parameter_id, value) values (u, t, bp, 80)
      on conflict (user_id, date, parameter_id) do update set value = excluded.value;
    insert into body_parameter_values(user_id, date, parameter_id, value) values (u, t, bp, 81)
      on conflict (user_id, date, parameter_id) do update set value = excluded.value;
    select count(*) into n from body_parameter_values where user_id = u and parameter_id = bp;
    insert into res values ('F1 параметр тела: одна строка на день', 1, n);
    select value into p1 from body_parameter_values where user_id = u and parameter_id = bp and date = t;
    insert into res values ('F2 параметр тела: победила последняя запись', 81, p1);
  end;

  -- G. повторная вставка с тем же клиентским uuid → 23505 (очередь считает «уже применено»), а не дубль
  rej := 0;
  begin
    insert into metrics(id, user_id, name, type, active) values (m, u, 'дубль', 'boolean', true);
  exception when unique_violation then rej := 1;
  end;
  insert into res values ('G1 вставка метрики с занятым uuid → unique_violation (23505)', 1, rej);
end $$;

select format('%-90s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
