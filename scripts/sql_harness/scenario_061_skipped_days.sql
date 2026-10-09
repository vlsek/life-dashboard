-- Сценарий для run.sh 061: пропуск дня метрики без разрыва серии (BACKLOG 47.3). Серия дня, серия категории, защита пропусков (окно вчера/сегодня).
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

create function pg_temp.mk_metric(u uuid, p_cat uuid default null) returns uuid as $$
declare m uuid := gen_random_uuid();
begin
  insert into metrics(id, user_id, name, type, active, category_id) values (m, u, 'm', 'boolean', true, p_cat);
  return m;
end $$ language plpgsql;

create function pg_temp.done(u uuid, m uuid, d date) returns void as $$
begin
  insert into daily_values(user_id, date, metric_id, value) values (u, d, m, 'true');
end $$ language plpgsql;

do $$
declare
  u uuid; t date; m1 uuid; m2 uuid; cat uuid; rej int;
begin
  -- A. одна метрика: вчера не выполнена. Без пропуска серия рвётся, с пропуском — вчера «не нужно», серия продолжается
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u);
  perform pg_temp.done(u, m1, t); perform pg_temp.done(u, m1, t - 2); perform pg_temp.done(u, m1, t - 3);
  insert into res values ('A1 вчера не выполнено, пропуска нет: серия 1 (только сегодня)', 1, calc_perfect_streak(u));
  update metrics set skipped_days = array[t - 1] where id = m1;
  insert into res values ('A2 вчера пропущено: серия не рвётся (сегодня, позавчера, ещё день = 3)', 3, calc_perfect_streak(u));
  update metrics set skipped_days = '{}' where id = m1;
  insert into res values ('A3 пропуск снят — серия снова 1', 1, calc_perfect_streak(u));

  -- B. две метрики: M2 вчера не выполнена и пропущена; M1 вчера выполнена — день считается идеальным
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u); m2 := pg_temp.mk_metric(u);
  perform pg_temp.done(u, m1, t); perform pg_temp.done(u, m2, t);
  perform pg_temp.done(u, m1, t - 1);
  perform pg_temp.done(u, m1, t - 2); perform pg_temp.done(u, m2, t - 2);
  insert into res values ('B1 M2 вчера не выполнена: серия 1', 1, calc_perfect_streak(u));
  update metrics set skipped_days = array[t - 1] where id = m2;
  insert into res values ('B2 M2 вчера пропущена: вчера идеальный по M1 — серия 3', 3, calc_perfect_streak(u));

  -- C. пропущена метрика, а день без неё пуст: «не нужно» — серию не рвёт и не растит
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u);
  perform pg_temp.done(u, m1, t); perform pg_temp.done(u, m1, t - 2);
  update metrics set skipped_days = array[t - 1] where id = m1;
  insert into res values ('C1 день пропущен целиком: серия = сегодня + позавчера = 2 (пропущенный день не считается)', 2, calc_perfect_streak(u));

  -- D. серия по категории
  insert into metric_categories(key, label_en, label_ru) values ('cat_061', 'c', 'к') returning id into cat;
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, cat);
  perform pg_temp.done(u, m1, t); perform pg_temp.done(u, m1, t - 2);
  insert into res values ('D1 категория: вчера не выполнено — серия 1', 1, calc_category_streak(u, 'cat_061'));
  update metrics set skipped_days = array[t - 1] where id = m1;
  insert into res values ('D2 категория: вчера пропущено — серия 2', 2, calc_category_streak(u, 'cat_061'));

  -- E. защита: пропускать можно только вчера и сегодня
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u);
  update metrics set skipped_days = array[t] where id = m1;
  insert into res values ('E1 сегодня пропустить можно', 1, cardinality((select skipped_days from metrics where id = m1)));
  update metrics set skipped_days = array[t - 1, t] where id = m1;
  insert into res values ('E2 вчера тоже можно', 2, cardinality((select skipped_days from metrics where id = m1)));
  rej := 0;
  begin
    update metrics set skipped_days = array[t - 2, t - 1, t] where id = m1;
  exception when raise_exception then rej := 1;
  end;
  insert into res values ('E3 позавчера пропустить нельзя (так серию не «нарисовать»)', 1, rej);
  rej := 0;
  begin
    update metrics set skipped_days = array[t + 1] where id = m1;
  exception when raise_exception then rej := 1;
  end;
  insert into res values ('E4 завтра пропустить нельзя', 1, rej);
  update metrics set skipped_days = array[t] where id = m1;
  insert into res values ('E5 вчерашний пропуск можно снять (отмена)', 1, cardinality((select skipped_days from metrics where id = m1)));

  -- F. старые пропуски — история: менять нельзя (они «прошли» окно); имитируем, записав обходом триггера
  alter table metrics disable trigger metrics_skipped_days_guard;
  update metrics set skipped_days = array[t - 10] where id = m1;
  alter table metrics enable trigger metrics_skipped_days_guard;
  rej := 0;
  begin
    update metrics set skipped_days = '{}' where id = m1;
  exception when raise_exception then rej := 1;
  end;
  insert into res values ('F1 старый пропуск (10 дней назад) снять нельзя', 1, rej);
  update metrics set name = 'x' where id = m1;
  insert into res values ('F2 другие правки метрики со старым пропуском работают', 1, 1);

  -- G. при создании метрики пропусков быть не должно
  rej := 0;
  begin
    insert into metrics(id, user_id, name, type, active, skipped_days) values (gen_random_uuid(), u, 'новая', 'boolean', true, array[t]);
  exception when raise_exception then rej := 1;
  end;
  insert into res values ('G1 метрика не может быть создана сразу с пропусками', 1, rej);
end $$;

select format('%-90s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
