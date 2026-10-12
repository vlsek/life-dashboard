-- 079: серия «выполняю цели каждый день» (BACKLOG 60.1 срез 1, агент 1; владелец 2026-10-12: «за выполнение целей каждый день пусть человек тоже получает стрики»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен: create or replace). Нужны: goals (done_date), 070 (streak_pauses), user_today (030).
--
-- Правило (по усмотрению агента, обсуждаемо): день засчитан, если в этот день ВЫПОЛНЕНА хотя бы одна цель (goals.done = true и done_date = день).
--  * Сегодняшний день, пока цели не выполнены, серию НЕ рвёт (она «со вчера», как у calc_perfect_streak) — и не растёт.
--  * Дни режима паузы (streak_pauses, 070: отпуск/болезнь) серию не рвут и не увеличивают.
--  * Огоньки/баллы за эту серию НЕ начисляются (отдельное решение владельца); функции только читают.
-- calc_goals_streak(user) → int (текущая серия). get_my_goals_streak() → jsonb {current, best} для вошедшего пользователя.
-- Откат: drop function get_my_goals_streak(); drop function calc_goals_streak(uuid);

create or replace function calc_goals_streak(target_user uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  streak int := 0;
  iterations int := 0;
  today_d date := user_today(target_user);
  cursor_date date := user_today(target_user);
begin
  loop
    exit when iterations >= 3650;
    iterations := iterations + 1;

    if exists (select 1 from streak_pauses p where p.user_id = target_user and cursor_date between p.from_date and p.to_date) then
      cursor_date := cursor_date - 1;
      continue;
    end if;

    if exists (select 1 from goals g where g.user_id = target_user and g.done = true and g.done_date = cursor_date) then
      streak := streak + 1;
    elsif cursor_date = today_d then
      null; -- сегодняшний день ещё не закончился
    else
      exit;
    end if;
    cursor_date := cursor_date - 1;
  end loop;
  return streak;
end;
$$;

create or replace function get_my_goals_streak()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  best int := 0;
  run int := 0;
  prev date := null;
  r record;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  -- лучшая серия: подряд идущие дни с выполненной целью; дни паузы между ними «склеивают» серию
  for r in
    select distinct g.done_date d from goals g where g.user_id = me and g.done = true and g.done_date is not null order by 1
  loop
    if prev is not null and (
      r.d = prev + 1
      or not exists (
        select 1 from generate_series(prev + 1, r.d - 1, interval '1 day') gs(x)
        where not exists (select 1 from streak_pauses p where p.user_id = me and gs.x::date between p.from_date and p.to_date)
      )
    ) then
      run := run + 1;
    else
      run := 1;
    end if;
    best := greatest(best, run);
    prev := r.d;
  end loop;
  return jsonb_build_object('current', calc_goals_streak(me), 'best', greatest(best, calc_goals_streak(me)));
end;
$$;

revoke all on function calc_goals_streak(uuid) from public;
revoke all on function get_my_goals_streak() from public;
grant execute on function get_my_goals_streak() to authenticated;
