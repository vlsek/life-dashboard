-- Сценарий для run.sh 057: огоньки стриков (BACKLOG 46.3). Начисление по метрикам, идемпотентность, потолок, окно «сегодня+вчера», старт с нуля,
-- откат (и запрет отката потраченного), защита трат, архив, удалённая метрика, правило «не больше», «задним числом».
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);

create function pg_temp.mk_user() returns uuid as $$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users(id) values (u);
  insert into profiles(user_id) values (u);
  perform set_config('request.jwt.claim.sub', u::text, true);
  return u;
end $$ language plpgsql;

create function pg_temp.mk_metric(u uuid, p_type text, p_goal numeric, p_dir text, p_active boolean, p_count boolean) returns uuid as $$
declare m uuid := gen_random_uuid();
begin
  insert into metrics(id, user_id, name, type, goal_value, goal_direction, active, count_streak) values (m, u, 'm', p_type, p_goal, p_dir, p_active, p_count);
  return m;
end $$ language plpgsql;

create function pg_temp.put(u uuid, m uuid, d date, v jsonb) returns void as $$
begin
  insert into daily_values(user_id, date, metric_id, value) values (u, d, m, v)
  on conflict (user_id, date, metric_id) do update set value = excluded.value;
end $$ language plpgsql;

create function pg_temp.bal() returns bigint as $$ select balance from get_sparks_balance() $$ language sql;

do $$
declare
  u uuid; m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid; m6 uuid; m7 uuid; w uuid;
  t date; s record; rej int; x int;
begin
  update sparks_config set day = current_date - 30 where key = 'start_date';
  update sparks_config set num = 10 where key = 'daily_cap';

  -- A. три выполненные метрики → +3; невыполненная, без «считать серию» и выключенная — не считаются; повтор ничего не добавляет
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  m2 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  m3 := pg_temp.mk_metric(u, 'number', 10, 'at_least', true, true);
  m4 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);   -- не выполнена
  m5 := pg_temp.mk_metric(u, 'boolean', null, null, true, false);  -- без «считать серию»
  m6 := pg_temp.mk_metric(u, 'boolean', null, null, false, true);  -- выключена
  perform pg_temp.put(u, m1, t, 'true'); perform pg_temp.put(u, m2, t, 'true'); perform pg_temp.put(u, m3, t, '12');
  perform pg_temp.put(u, m4, t, 'false'); perform pg_temp.put(u, m5, t, 'true'); perform pg_temp.put(u, m6, t, 'true');
  select * into s from sync_streak_sparks();
  insert into res values ('A1 три выполненные метрики: +3', 3, s.added);
  insert into res values ('A2 баланс 3', 3, s.balance);
  select * into s from sync_streak_sparks();
  insert into res values ('A3 повторная синхронизация: +0 (идемпотентно)', 0, s.added);
  insert into res values ('A4 баланс по-прежнему 3', 3, s.balance);

  -- B. окно: вчера считается, три дня назад — нет
  perform pg_temp.put(u, m1, t - 1, 'true'); perform pg_temp.put(u, m2, t - 3, 'true');
  select * into s from sync_streak_sparks();
  insert into res values ('B1 вчера засчитано (+1), позавчера+ — нет', 1, s.added);

  -- C. потолок в сутки
  u := pg_temp.mk_user(); t := user_today(u);
  update sparks_config set num = 2 where key = 'daily_cap';
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true); m2 := pg_temp.mk_metric(u, 'boolean', null, null, true, true); m3 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  perform pg_temp.put(u, m1, t, 'true'); perform pg_temp.put(u, m2, t, 'true'); perform pg_temp.put(u, m3, t, 'true');
  select * into s from sync_streak_sparks();
  insert into res values ('C1 потолок 2 в сутки при трёх выполненных', 2, s.balance);
  update sparks_config set num = 10 where key = 'daily_cap';

  -- D. старт с нуля: дни раньше start_date не считаются
  u := pg_temp.mk_user(); t := user_today(u);
  update sparks_config set day = t where key = 'start_date';
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  perform pg_temp.put(u, m1, t - 1, 'true');
  select * into s from sync_streak_sparks();
  insert into res values ('D1 вчера до start_date: не считается', 0, s.balance);
  perform pg_temp.put(u, m1, t, 'true');
  select * into s from sync_streak_sparks();
  insert into res values ('D2 сегодня (в start_date): считается', 1, s.balance);
  update sparks_config set day = current_date - 30 where key = 'start_date';

  -- E. откат: отметку сняли → огонёк снимается
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  perform pg_temp.put(u, m1, t, 'true');
  perform sync_streak_sparks();
  perform pg_temp.put(u, m1, t, 'false');
  select * into s from sync_streak_sparks();
  insert into res values ('E1 отметку сняли: огонёк снят', 1, s.removed);
  insert into res values ('E2 баланс 0', 0, s.balance);

  -- F. потраченное не отнимается: сняли отметку, но огоньки уже потрачены
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true); m2 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  perform pg_temp.put(u, m1, t, 'true'); perform pg_temp.put(u, m2, t, 'true');
  perform sync_streak_sparks();
  insert into shop_items(user_id, name, cost, cost_sparks, redeemed) values (u, 'Кофе', 100, 2, false) returning id into w;
  update shop_items set redeemed = true where id = w;
  perform pg_temp.put(u, m1, t, 'false');
  select * into s from sync_streak_sparks();
  insert into res values ('F1 огоньки потрачены — откат не отнимает (removed 0)', 0, s.removed);
  insert into res values ('F2 заработано по-прежнему 2', 2, s.earned);
  insert into res values ('F3 потрачено 2, баланс 0', 0, s.balance);

  -- G. защита трат
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true); m2 := pg_temp.mk_metric(u, 'boolean', null, null, true, true); m3 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  perform pg_temp.put(u, m1, t, 'true'); perform pg_temp.put(u, m2, t, 'true'); perform pg_temp.put(u, m3, t, 'true');
  perform sync_streak_sparks();   -- баланс 3
  insert into shop_items(user_id, name, cost, cost_sparks) values (u, 'Дорого', 100, 5) returning id into w;
  insert into res select 'G1 у вещи за огоньки cost принудительно 0 (монеты не затронуты)', 0, cost from shop_items where id = w;
  rej := 0;
  begin
    update shop_items set redeemed = true where id = w;
  exception when raise_exception then rej := 1;
  end;
  insert into res values ('G2 купить за 5 при балансе 3: отклонено', 1, rej);
  insert into shop_items(user_id, name, cost, cost_sparks) values (u, 'Дёшево', 100, 3) returning id into w;
  update shop_items set redeemed = true where id = w;
  insert into res select 'G3 купить за 3 при балансе 3: можно, баланс 0', 0, pg_temp.bal();
  rej := 0;
  begin
    insert into shop_items(user_id, name, cost, cost_sparks, redeemed) values (u, 'Сразу выкупленное', 0, 1, true);
  exception when raise_exception then rej := 1;
  end;
  insert into res values ('G4 вставка сразу выкупленной без денег: отклонено', 1, rej);

  -- H. архивная вещь не покупается
  rej := 0;
  begin
    insert into shop_items(user_id, name, cost, cost_sparks, archived, redeemed) values (u, 'Старое', 0, 1, true, true);
  exception when raise_exception then rej := 1;
  end;
  insert into res values ('H1 архивную вещь выкупить нельзя', 1, rej);

  -- I. удалённая метрика историю не стирает
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  perform pg_temp.put(u, m1, t, 'true');
  perform sync_streak_sparks();
  delete from daily_values where metric_id = m1;
  delete from metrics where id = m1;
  select * into s from sync_streak_sparks();
  insert into res values ('I1 метрику удалили: заработанный огонёк остался', 1, s.balance);

  -- K. правило «не больше»: 3 при цели 5 — выполнено; 0 и 7 — нет
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, 'number', 5, 'at_most', true, true);
  perform pg_temp.put(u, m1, t, '3');
  select * into s from sync_streak_sparks();
  insert into res values ('K1 «не больше» 5: значение 3 — засчитано', 1, s.balance);
  perform pg_temp.put(u, m1, t, '0'); perform sync_streak_sparks();
  insert into res values ('K2 значение 0 — не засчитано (огонёк снят)', 0, pg_temp.bal());
  perform pg_temp.put(u, m1, t, '7'); perform sync_streak_sparks();
  insert into res values ('K3 значение 7 больше цели — не засчитано', 0, pg_temp.bal());

  -- L. «задним числом» (по желанию): день 5 дней назад; повтор безопасен; вчера не трогает
  u := pg_temp.mk_user(); t := user_today(u);
  m1 := pg_temp.mk_metric(u, 'boolean', null, null, true, true);
  perform pg_temp.put(u, m1, t - 5, 'true'); perform pg_temp.put(u, m1, t - 1, 'true');
  x := backfill_streak_sparks(null);
  insert into res values ('L1 задним числом: засчитан день 5 дней назад (вчера — зона синхронизации)', 1, x);
  x := backfill_streak_sparks(null);
  insert into res values ('L2 повтор — 0', 0, x);
end $$;

select format('%-62s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
