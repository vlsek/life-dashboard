-- 018_sets_type_sql_support.sql
--
-- Тип метрики "sets" (Подходы) появился в приложении раньше (016/frontend), но серверные
-- SQL-функции (баллы, лидерборд, streak) про него не знали — считали `m.type = 'number'`
-- явно, и метрики типа "Подходы" в них просто не участвовали (0 баллов, streak не растёт).
-- Это было не страшно, пока "Подходы" были только НОВЫМ типом метрики. Но если существующую
-- метрику (например "Отжимания", тип "Число") ПЕРЕКЛЮЧИТЬ на тип "Подходы" — весь набранный
-- на ней прогресс (баллы/лидерборд/streak) должен продолжать считаться как раньше, просто
-- теперь по сумме повторений во всех подходах за день, а не по единственному числу.
--
-- Общий хелпер: даёт числовое значение метрики независимо от формата хранения —
-- либо обычное число (metrics.type = 'number', или "sets" за дни ДО конвертации, когда
-- там ещё лежало старое число), либо сумма reps по всем подходам (jsonb-массив,
-- metrics.type = 'sets' за дни ПОСЛЕ конвертации). Данные за дни до конвертации не
-- трогаются и не мигрируются — читаются "как есть", в обоих форматах.
create or replace function metric_numeric_value(mtype text, val jsonb)
returns numeric as $$
begin
  if val is null then return null; end if;
  if mtype = 'sets' and jsonb_typeof(val) = 'array' then
    return (select coalesce(sum(coalesce((elem->>'reps')::numeric, 0)), 0) from jsonb_array_elements(val) elem);
  end if;
  return (val)::numeric;
end;
$$ language plpgsql immutable;

grant execute on function metric_numeric_value(text, jsonb) to authenticated;

-- ===== Общие баллы пользователя (используется в get_leaderboard и балансе магазина) =====
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
        then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value,0))::int
      when m.type in ('number', 'sets')
        then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value,0))::int
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

-- ===== Баллы за конкретный день (используется в ленте "что сделали сегодня") =====
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
        then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value,0))::int
      when m.type in ('number', 'sets')
        then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value,0))::int
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

-- ===== Streak "идеальных дней" (все активные метрики выполнены) =====
create or replace function calc_perfect_streak(target_user uuid)
returns int as $$
declare
  streak int := 0;
  cursor_date date := current_date;
begin
  if not exists (select 1 from metrics where user_id = target_user and active = true) then
    return 0;
  end if;

  if not exists (
    select 1 from daily_values dv join metrics m on m.id = dv.metric_id
    where dv.user_id = target_user and m.active = true and dv.date = current_date
  ) then
    cursor_date := current_date - 1;
  end if;

  loop
    exit when streak >= 3650;
    if exists (
      select 1 from metrics m
      where m.user_id = target_user and m.active = true
      and not exists (
        select 1 from daily_values dv
        where dv.user_id = target_user and dv.metric_id = m.id and dv.date = cursor_date
        and (
          case
            when m.type = 'boolean' then (dv.value = 'true'::jsonb)
            when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)
            when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
              then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value,0))
            when m.type in ('number', 'sets')
              then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value,0))
            else false
          end
        )
      )
    ) then
      exit;
    end if;
    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end;
$$ language plpgsql security definer;

grant execute on function calc_perfect_streak(uuid) to authenticated;

-- ===== Streak по категории (используется в Сообществе, сравнение по активности) =====
create or replace function calc_category_streak(target_user uuid, cat_key text)
returns int as $$
declare
  streak int := 0;
  cursor_date date := current_date;
  cat_id uuid;
begin
  select id into cat_id from metric_categories where key = cat_key;
  if cat_id is null then return 0; end if;

  if not exists (
    select 1 from daily_values dv join metrics m on m.id = dv.metric_id
    where dv.user_id = target_user and m.category_id = cat_id and m.active = true and dv.date = current_date
  ) then
    cursor_date := current_date - 1;
  end if;

  loop
    exit when streak >= 3650;
    if not exists (
      select 1 from daily_values dv join metrics m on m.id = dv.metric_id
      where dv.user_id = target_user and m.category_id = cat_id and m.active = true
      and dv.date = cursor_date
      and (
        case
          when m.type = 'boolean' then (dv.value = 'true'::jsonb)
          when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)
          when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
            then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value,0))
          when m.type in ('number', 'sets')
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value,0))
          else false
        end
      )
    ) then
      exit;
    end if;
    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end;
$$ language plpgsql security definer;

grant execute on function calc_category_streak(uuid, text) to authenticated;

-- ===== Сравнение по активности в Сообществе (сумма значений + баллы + streak по категории) =====
create or replace function get_category_leaderboard(cat_key text, range_key text default 'all')
returns table(user_id uuid, display_name text, avatar_url text, total_value numeric, category_points int, leaderboard_visible boolean, category_streak int) as $$
declare
  cat_id uuid;
  from_date date;
  to_date date;
begin
  select id into cat_id from metric_categories where key = cat_key;

  case range_key
    when 'week' then
      from_date := date_trunc('week', current_date)::date;
      to_date := current_date;
    when 'last_week' then
      from_date := (date_trunc('week', current_date) - interval '7 days')::date;
      to_date := (date_trunc('week', current_date) - interval '1 day')::date;
    when 'month' then
      from_date := date_trunc('month', current_date)::date;
      to_date := current_date;
    else
      from_date := '1900-01-01'::date;
      to_date := current_date;
  end case;

  return query
  select p.user_id,
    coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
    p.avatar_url,
    coalesce((
      select sum(metric_numeric_value(m.type, dv.value))
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.type in ('number', 'sets') and m.category_id = cat_id
      where dv.user_id = p.user_id and m.active = true and dv.date between from_date and to_date
    ), 0)::numeric as total_value,
    coalesce((
      select sum(
        case
          when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
          when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
          when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
            then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value,0))::int
          when m.type in ('number', 'sets')
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value,0))::int
          else 0
        end
      )
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.category_id = cat_id
      where dv.user_id = p.user_id and m.active = true and dv.date between from_date and to_date
    ), 0)::int as category_points,
    p.leaderboard_visible,
    calc_category_streak(p.user_id, cat_key)
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;

grant execute on function get_category_leaderboard(text, text) to authenticated;
