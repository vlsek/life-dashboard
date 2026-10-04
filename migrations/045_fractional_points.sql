-- 045_fractional_points.sql
-- ДРОБНЫЕ БАЛЛЫ за подходы (BACKLOG 13 «Баллы за каждый подход, а не только за полностью выполненную метрику»; решение владельца 2026-10-03:
-- дробно считаем ТОЛЬКО метрики-подходы; прошлые дни НЕ пересчитываем; округляем до 0,1 везде; в SQL баллы становятся numeric).
-- Это ЧЕТВЁРТЫЙ срез «подходов в день по плану» (после 041 — журнал, 044 — серверное правило «выполнено»). Клиент считает так же (v2.69+).
--
-- ПРАВИЛО. Метрика типа sets (не «не более»), у которой на ДАТУ дня в силе запись журнала planned_sets_log с «frac»: true и числом N >= 1:
--   • полностью выполнена (подходов >= N и объём достиг goal_value) — 1 балл, как раньше;
--   • не выполнена — round(10 * подходов / N) / 10, но НЕ БОЛЬШЕ 0,9 (1 балл — только за полностью выполненную): 1 подход из 5 = 0,2; из 2 = 0,5;
--     округление «половина вверх» считается целыми числами (20*подходов + N) / (2*N) — без ошибок плавающей точки (так же на клиенте).
-- Подход = запись с повторами > 0 или с заполненным временем (пустые заготовки не считаются). Остальные типы метрик, «не более» и метрики
-- без «frac» считаются как раньше — целыми баллами.
-- ПРОШЛОЕ НЕ МЕНЯЕТСЯ: флаг «frac» ставит только форма метрики (v2.69+) в новой записи журнала «с сегодняшнего дня». Записи, сделанные
-- раньше (без «frac»), и все дни до записи остаются на прежнем правиле; смена N или снятие параметра — тоже новая запись, история не «прыгает».
--
-- ЧТО МЕНЯЕТСЯ В SQL. Тип баллов int → numeric (с округлением до 0,1) у функций: calc_user_points, calc_user_points_for_date, get_leaderboard,
-- get_today_activity, get_category_leaderboard. Менять тип возвращаемого значения через create or replace нельзя — функции пересоздаются
-- (drop + create, в одной транзакции), права execute для authenticated выдаются заново. Определения взяты из ПОСЛЕДНИХ версий (044 / 007 / 030);
-- в ветку «number/sets, не at_most» добавлена доля балла metric_partial_points(...). get_leaderboard_period (046) уже numeric и вызывает
-- calc_user_points* — подхватит сама. Серии (calc_perfect_streak / calc_category_streak) не меняются: «идеальный день» — по-прежнему полностью выполненные метрики.
-- Новые вспомогательные: planned_sets_count(значение), planned_sets_frac_on(журнал, дата), metric_partial_points(тип, журнал, значение, дата)
-- (закрыты revoke, как planned_sets_*).
--
-- ПРИМЕНЕНИЕ. Одним запуском в Supabase SQL Editor; повтор безопасен. Порядок: 041 → 044 → 045 (045 требует 044: использует planned_sets_ok).
-- Пока ни у одной метрики нет записи с «frac», все результаты те же, что раньше (меняется только тип: numeric вместо int, для клиента 12.0 — то же число 12).
-- Откат: вернуть функции из 044 (calc_*, get_category_leaderboard), 007 (get_leaderboard), 030 (get_today_activity) через drop + create.
-- Проверка — docs/sql-checks/045_fractional_points_check.sql.

begin;

-- ===== Подходов сделано: запись с повторами > 0 или с заполненным временем (то же, что в planned_sets_ok и на клиенте) =====
create or replace function planned_sets_count(val jsonb)
returns int as $$
  select case when jsonb_typeof(val) = 'array' then (
    select count(*)::int from jsonb_array_elements(val) s
    where (case when (s ->> 'reps') ~ '^-?\d+(\.\d+)?$' then (s ->> 'reps')::numeric else 0 end) > 0
       or coalesce(s ->> 'time', '') <> ''
  ) else 0 end;
$$ language sql immutable;

-- ===== N, действовавшее на дату, ТОЛЬКО если запись журнала в силе помечена frac: true; иначе null (дробных баллов нет) =====
create or replace function planned_sets_frac_on(plan_log jsonb, d date)
returns int as $$
  select case when (t.e -> 'frac') = 'true'::jsonb and jsonb_typeof(t.e -> 'n') = 'number' and floor((t.e ->> 'n')::numeric) >= 1
              then floor((t.e ->> 'n')::numeric)::int end
  from jsonb_array_elements(case when jsonb_typeof(plan_log) = 'array' then plan_log else '[]'::jsonb end) with ordinality as t(e, ord)
  where jsonb_typeof(t.e) = 'object'
    and (t.e ->> 'from') ~ '^\d{4}-\d{2}-\d{2}$'
    and (t.e ->> 'from') <= to_char(d, 'YYYY-MM-DD')
  order by (t.e ->> 'from') desc, t.ord desc
  limit 1;
$$ language sql immutable;

-- ===== Доля балла за ЧАСТИЧНО выполненную метрику-подходы (0 … 0,9); звать только для НЕвыполненных и не «не более» =====
create or replace function metric_partial_points(m_type text, plan_log jsonb, val jsonb, d date)
returns numeric as $$
  select coalesce(
    (select least(9, (20 * planned_sets_count(val) + f.n) / (2 * f.n))::numeric / 10
     from (select planned_sets_frac_on(plan_log, d) as n) f
     where m_type = 'sets' and f.n is not null),
    0);
$$ language sql immutable;

revoke all on function planned_sets_count(jsonb) from public, anon, authenticated;
revoke all on function planned_sets_frac_on(jsonb, date) from public, anon, authenticated;
revoke all on function metric_partial_points(text, jsonb, jsonb, date) from public, anon, authenticated;

-- ===== Пять функций: тип баллов int -> numeric (drop + create, права выдаются заново) =====
drop function if exists calc_user_points(uuid);
drop function if exists calc_user_points_for_date(uuid, date);
drop function if exists get_leaderboard();
drop function if exists get_today_activity();
drop function if exists get_category_leaderboard(text, text);

create or replace function calc_user_points(target_user uuid)
returns numeric as $$
declare
  daily_pts numeric := 0;
  goal_pts int := 0;
  skill_pts int := 0;
  book_pts int := 0;
begin
  select coalesce(sum(
    case
      when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
      when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
      when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
        then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))::int
      when m.type in ('number', 'sets')
        then (case when (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date)) then 1 else metric_partial_points(m.type, m.planned_sets_log, dv.value, dv.date) end)
      else 0
    end
  ), 0) into daily_pts
  from daily_values dv
  join metrics m on m.id = dv.metric_id
  where dv.user_id = target_user and m.active = true;

  select coalesce(sum(points), 0) into goal_pts from goals where user_id = target_user and done = true;
  select coalesce(sum(points), 0) into skill_pts from skills where user_id = target_user and mastered = true;
  select coalesce(sum(points), 0) into book_pts from books where user_id = target_user and status = 'done';

  return round(daily_pts + goal_pts + skill_pts + book_pts, 1);
end;
$$ language plpgsql security definer;

grant execute on function calc_user_points(uuid) to authenticated;

create or replace function calc_user_points_for_date(target_user uuid, target_date date)
returns numeric as $$
declare
  pts numeric := 0;
begin
  select coalesce(sum(
    case
      when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
      when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
      when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
        then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))::int
      when m.type in ('number', 'sets')
        then (case when (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date)) then 1 else metric_partial_points(m.type, m.planned_sets_log, dv.value, dv.date) end)
      else 0
    end
  ), 0) into pts
  from daily_values dv
  join metrics m on m.id = dv.metric_id
  where dv.user_id = target_user and m.active = true and dv.date = target_date;
  return round(pts, 1);
end;
$$ language plpgsql security definer;

grant execute on function calc_user_points_for_date(uuid, date) to authenticated;

create or replace function get_leaderboard()
returns table (user_id uuid, display_name text, avatar_url text, total_points numeric, perfect_streak int, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id,
         coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
         p.avatar_url, calc_user_points(p.user_id), calc_perfect_streak(p.user_id), p.leaderboard_visible
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;
grant execute on function get_leaderboard() to authenticated;

create or replace function get_today_activity()
returns table (user_id uuid, display_name text, avatar_url text, today_points numeric, notes text, items jsonb, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id,
         coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
         p.avatar_url, calc_user_points_for_date(p.user_id, t.td),
         dn.notes, dn.items, p.leaderboard_visible
  from profiles p
  cross join lateral (select user_today(p.user_id) as td) t
  left join daily_notes dn on dn.user_id = p.user_id and dn.date = t.td
  order by 4 desc;
end;
$$ language plpgsql security definer;
grant execute on function get_today_activity() to authenticated;

create or replace function get_category_leaderboard(cat_key text, range_key text default 'all')
returns table(user_id uuid, display_name text, avatar_url text, total_value numeric, category_points numeric, leaderboard_visible boolean, category_streak int) as $$
declare
  cat_id uuid;
begin
  select id into cat_id from metric_categories where key = cat_key;

  return query
  select p.user_id,
    coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
    p.avatar_url,
    coalesce((
      select sum(metric_numeric_value(m.type, dv.value))
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.type in ('number', 'sets') and m.category_id = cat_id
      where dv.user_id = p.user_id and m.active = true
        and dv.date between period_from(t.td, range_key) and period_to(t.td, range_key)
    ), 0)::numeric as total_value,
    coalesce((
      select sum(
        case
          when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
          when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
          when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
            then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))::int
          when m.type in ('number', 'sets')
            then (case when (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date)) then 1 else metric_partial_points(m.type, m.planned_sets_log, dv.value, dv.date) end)
          else 0
        end
      )
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.category_id = cat_id
      where dv.user_id = p.user_id and m.active = true
        and dv.date between period_from(t.td, range_key) and period_to(t.td, range_key)
    ), 0)::numeric as category_points,
    p.leaderboard_visible,
    calc_category_streak(p.user_id, cat_key)
  from profiles p
  cross join lateral (select user_today(p.user_id) as td) t
  order by 4 desc;
end;
$$ language plpgsql security definer;

grant execute on function get_category_leaderboard(text, text) to authenticated;

commit;
