-- 044_planned_sets_server.sql
-- Серверные серии, баллы и лидерборд считают «выполнено» по правилу «подходов в день по плану» — так же, как клиент
-- (BACKLOG 4.2 «Не меньше X подходов» + раздел 13, решение владельца 2026-10-03; клиент: v2.43 Дашборд, v2.50 шапка/История/Магазин/баланс).
-- Это ТРЕТИЙ срез: без него серии и лидерборд на сервере считали бы по старому правилу (сумма повторов >= goal_value) и расходились
-- бы с кольцами дня и балансом, как только метрике задали бы число подходов.
--
-- ЧТО ДЕЛАЕТ. Метрика типа sets, у которой в журнале metrics.planned_sets_log (миграция 041) на ДАТУ дня действует число N >= 1,
-- считается выполненной в этот день, когда сделано не меньше N подходов (подход = запись с повторами > 0 или с заполненным временем,
-- пустые заготовки не считаются) И объём (сумма повторов) достиг цели goal_value — оба условия сразу, как в клиентском isMetricDone().
-- Направление «не более» правило не затрагивает. Метрики других типов и метрики без журнала считаются как раньше — ничего не меняется.
-- Журнал хранит [{"from":"YYYY-MM-DD","n":3}, ...]; каждый день считается по записи, действовавшей в ЭТОТ день, поэтому прошлые дни и
-- уже набранные баллы/серии НЕ пересчитываются — ни при включении параметра, ни при смене N (n = null — параметр снят с даты).
--
-- КАК СДЕЛАНО. Две новые вспомогательные функции — planned_sets_on(журнал, дата) (N на дату или null) и planned_sets_ok(тип, журнал,
-- значение, дата) (true, если правило не действует или подходов достаточно). В пять функций, которые считают «выполнено», в ветку
-- «number/sets, не at_most» добавлено «and planned_sets_ok(...)»: calc_user_points, calc_user_points_for_date, get_category_leaderboard
-- (определения взяты из 033) и calc_perfect_streak, calc_category_streak (из 037 — «серия со вчера» сохранена). Остальное в них — как
-- было, сигнатуры не менялись; get_leaderboard и get_today_activity вызывают эти функции — подхватят сами. Вода: эффективная норма
-- (metric_null_goal из 033/043) не затронута.
--
-- ПРИМЕНЕНИЕ. Одним запуском в Supabase SQL Editor, повтор безопасен (create or replace, add column if not exists). Миграцию 041
-- применять не обязательно раньше — колонка planned_sets_log добавляется и здесь, если её ещё нет. Пока параметр никому не задан,
-- результаты всех функций совпадают с прежними. ВАЖНО: брать функции из ЭТОГО файла — если после него кто-то выпустит миграцию,
-- переопределяющую эти пять функций, её нужно строить на определениях отсюда.
-- Откат: вернуть определения из 033 (calc_user_points, calc_user_points_for_date, get_category_leaderboard) и 037 (две серии);
-- колонка и вспомогательные функции могут остаться.
-- Проверка после применения — docs/sql-checks/044_planned_sets_server_check.sql.

alter table metrics add column if not exists planned_sets_log jsonb;

-- ===== N подходов, действовавшее на дату: последняя запись журнала с from <= дата; n = null / n < 1 / мусор → null =====
-- Сравнение дат — строками ISO (как на клиенте), без приведения from к date: мусор в журнале не должен ронять расчёт баллов.
-- При равных from побеждает запись, стоящая в массиве позже (как в клиентском plannedSetsFor).
create or replace function planned_sets_on(plan_log jsonb, d date)
returns int as $$
  select case when jsonb_typeof(t.e -> 'n') = 'number' and floor((t.e ->> 'n')::numeric) >= 1
              then floor((t.e ->> 'n')::numeric)::int end
  from jsonb_array_elements(case when jsonb_typeof(plan_log) = 'array' then plan_log else '[]'::jsonb end) with ordinality as t(e, ord)
  where jsonb_typeof(t.e) = 'object'
    and (t.e ->> 'from') ~ '^\d{4}-\d{2}-\d{2}$'
    and (t.e ->> 'from') <= to_char(d, 'YYYY-MM-DD')
  order by (t.e ->> 'from') desc, t.ord desc
  limit 1;
$$ language sql immutable;

-- ===== Условие «подходов достаточно» для дня d. true — правило не действует (другой тип, нет журнала, на эту дату параметр не задан) =====
-- Вызывается только из ветки «не at_most»; у значения не-массива (старое число до конвертации метрики в «Подходы») подходов 0.
create or replace function planned_sets_ok(m_type text, plan_log jsonb, val jsonb, d date)
returns boolean as $$
  select case
    when m_type <> 'sets' or plan_log is null then true
    else coalesce(
      (case when jsonb_typeof(val) = 'array' then (
         select count(*) from jsonb_array_elements(val) s
         where (case when (s ->> 'reps') ~ '^-?\d+(\.\d+)?$' then (s ->> 'reps')::numeric else 0 end) > 0
            or coalesce(s ->> 'time', '') <> ''
       ) else 0 end) >= planned_sets_on(plan_log, d),
      true)
  end;
$$ language sql immutable;

-- Помощники закрыты от прямого вызова (как в 033): их зовут только security definer функции ниже, клиенту они не нужны.
revoke all on function planned_sets_on(jsonb, date) from public, anon, authenticated;
revoke all on function planned_sets_ok(text, jsonb, jsonb, date) from public, anon, authenticated;

-- ===== Пять функций: в ветку «number/sets, не at_most» добавлено planned_sets_ok(...) =====

create or replace function calc_user_points(target_user uuid)
returns int as $$
declare
  daily_pts int := 0;
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
        then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date))::int
      else 0
    end
  ), 0) into daily_pts
  from daily_values dv
  join metrics m on m.id = dv.metric_id
  where dv.user_id = target_user and m.active = true;

  select coalesce(sum(points), 0) into goal_pts from goals where user_id = target_user and done = true;
  select coalesce(sum(points), 0) into skill_pts from skills where user_id = target_user and mastered = true;
  select coalesce(sum(points), 0) into book_pts from books where user_id = target_user and status = 'done';

  return daily_pts + goal_pts + skill_pts + book_pts;
end;
$$ language plpgsql security definer;

grant execute on function calc_user_points(uuid) to authenticated;

create or replace function calc_user_points_for_date(target_user uuid, target_date date)
returns int as $$
declare
  pts int := 0;
begin
  select coalesce(sum(
    case
      when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
      when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
      when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
        then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))::int
      when m.type in ('number', 'sets')
        then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date))::int
      else 0
    end
  ), 0) into pts
  from daily_values dv
  join metrics m on m.id = dv.metric_id
  where dv.user_id = target_user and m.active = true and dv.date = target_date;
  return pts;
end;
$$ language plpgsql security definer;

grant execute on function calc_user_points_for_date(uuid, date) to authenticated;

create or replace function calc_perfect_streak(target_user uuid)
returns int as $$
declare
  streak int := 0;
  iterations int := 0;
  today_d date := user_today(target_user);
  cursor_date date := user_today(target_user);
  expected_cnt int;
begin
  if not exists (select 1 from metrics where user_id = target_user and active = true) then
    return 0;
  end if;


  loop
    exit when iterations >= 3650;
    iterations := iterations + 1;

    select count(*) into expected_cnt
    from metrics m
    where m.user_id = target_user and m.active = true and metric_expected_on(m.schedule, cursor_date);

    -- день, когда по расписанию ничего не нужно: серию не рвёт и не увеличивает
    if expected_cnt = 0 then
      cursor_date := cursor_date - 1;
      continue;
    end if;

    if exists (
      select 1 from metrics m
      where m.user_id = target_user and m.active = true
      and metric_expected_on(m.schedule, cursor_date)
      and not exists (
        select 1 from daily_values dv
        where dv.user_id = target_user and dv.metric_id = m.id and dv.date = cursor_date
        and (
          case
            when m.type = 'boolean' then (dv.value = 'true'::jsonb)
            when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)
            when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
              then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
            when m.type in ('number', 'sets')
              then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date))
            else false
          end
        )
      )
    ) then
      -- день не засчитан. Сегодняшний ещё не закончился — пропускаем его (серия «со вчера»); любой другой разрывает серию.
      if cursor_date = today_d then
        cursor_date := cursor_date - 1;
        continue;
      end if;
      exit;
    end if;

    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end;
$$ language plpgsql security definer;

grant execute on function calc_perfect_streak(uuid) to authenticated;

create or replace function calc_category_streak(target_user uuid, cat_key text)
returns int as $$
declare
  streak int := 0;
  iterations int := 0;
  today_d date := user_today(target_user);
  cursor_date date := user_today(target_user);
  cat_id uuid;
  expected_cnt int;
begin
  select id into cat_id from metric_categories where key = cat_key;
  if cat_id is null then return 0; end if;


  loop
    exit when iterations >= 3650;
    iterations := iterations + 1;

    select count(*) into expected_cnt
    from metrics m
    where m.user_id = target_user and m.category_id = cat_id and m.active = true
      and metric_expected_on(m.schedule, cursor_date);

    -- в этот день по расписанию нет ни одной метрики категории — день пропускаем
    if expected_cnt = 0 then
      cursor_date := cursor_date - 1;
      continue;
    end if;

    if not exists (
      select 1 from daily_values dv join metrics m on m.id = dv.metric_id
      where dv.user_id = target_user and m.category_id = cat_id and m.active = true
      and dv.date = cursor_date
      and (
        case
          when m.type = 'boolean' then (dv.value = 'true'::jsonb)
          when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)
          when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
            then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
          when m.type in ('number', 'sets')
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date))
          else false
        end
      )
    ) then
      if cursor_date = today_d then
        cursor_date := cursor_date - 1;
        continue;
      end if;
      exit;
    end if;

    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end;
$$ language plpgsql security definer;

grant execute on function calc_category_streak(uuid, text) to authenticated;

create or replace function get_category_leaderboard(cat_key text, range_key text default 'all')
returns table(user_id uuid, display_name text, avatar_url text, total_value numeric, category_points int, leaderboard_visible boolean, category_streak int) as $$
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
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date))::int
          else 0
        end
      )
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.category_id = cat_id
      where dv.user_id = p.user_id and m.active = true
        and dv.date between period_from(t.td, range_key) and period_to(t.td, range_key)
    ), 0)::int as category_points,
    p.leaderboard_visible,
    calc_category_streak(p.user_id, cat_key)
  from profiles p
  cross join lateral (select user_today(p.user_id) as td) t
  order by 4 desc;
end;
$$ language plpgsql security definer;

grant execute on function get_category_leaderboard(text, text) to authenticated;
