-- 030_user_timezone.sql
-- «Сегодня» на сервере — по часовому поясу пользователя, а не по поясу базы (BACKLOG 7.3).
--
-- ПРОБЛЕМА. Клиент пишет дни по ЛОКАЛЬНОЙ дате пользователя, а SQL-функции лидерборда и стриков брали
-- «сегодня» как current_date — то есть по поясу БД (в Supabase это UTC). У пользователей восточнее
-- Гринвича (Москва UTC+3, Вильнюс UTC+2/+3) между локальной полуночью и 2–3 часами ночи серверное
-- «сегодня» на день меньше клиентского: стрик и очки дня в Сообществе на эти часы отставали.
--
-- РЕШЕНИЕ.
--   1) profiles.timezone — IANA-имя пояса (например 'Europe/Moscow'), а НЕ смещение: так переход на
--      летнее время учитывается сам. Заполняет фронт (Дашборд-пилот) при входе.
--   2) user_today(uuid) — «сегодня» пользователя. Пока пояс не задан (NULL) или задан неверно,
--      возвращает current_date, то есть поведение прежнее — миграция безопасна для тех, у кого
--      пояс ещё не записан.
--   3) Функции переписаны с current_date на user_today(...):
--        get_today_activity()            — у каждого участника его собственное «сегодня»
--        get_category_leaderboard(...)   — границы недели/месяца считаются по «сегодня» каждого участника
--        calc_perfect_streak(uuid)       — стрик пользователя от его «сегодня»
--        calc_category_streak(uuid,text) — то же по категории
--
-- Миграция только добавляющая: create or replace, add column if not exists. Сигнатуры функций не
-- менялись. Откат: вернуть определения из 007 (get_today_activity), 018 (get_category_leaderboard) и
-- 023 (calc_*_streak); колонка profiles.timezone может остаться, она ничему не мешает.
--
-- Проверка после применения — docs/sql-checks/030_user_timezone_check.sql.

alter table profiles add column if not exists timezone text;   -- IANA-имя: 'Europe/Moscow', 'America/New_York'

-- ===== «Сегодня» пользователя =====
create or replace function user_today(target_user uuid)
returns date as $$
declare
  tz text;
begin
  select p.timezone into tz from profiles p where p.user_id = target_user;
  if tz is null or btrim(tz) = '' then
    return current_date;                     -- пояс не задан: как раньше
  end if;
  begin
    return (now() at time zone tz)::date;    -- локальная календарная дата в поясе пользователя
  exception when others then
    return current_date;                     -- неизвестное имя пояса: не ломаем лидерборд
  end;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Внутренняя функция: вызывается из security definer-функций ниже, клиенту не нужна и чужие пояса не отдаёт.
revoke all on function user_today(uuid) from public;

-- ===== Границы периода лидерборда от заданного «сегодня» =====
create or replace function period_from(td date, range_key text)
returns date as $$
  select case range_key
    when 'week'      then date_trunc('week', td::timestamp)::date
    when 'last_week' then (date_trunc('week', td::timestamp) - interval '7 days')::date
    when 'month'     then date_trunc('month', td::timestamp)::date
    else '1900-01-01'::date
  end
$$ language sql immutable;

create or replace function period_to(td date, range_key text)
returns date as $$
  select case range_key
    when 'last_week' then (date_trunc('week', td::timestamp) - interval '1 day')::date
    else td
  end
$$ language sql immutable;

-- ===== Активность за сегодня: у каждого участника своё «сегодня» =====
create or replace function get_today_activity()
returns table (user_id uuid, display_name text, avatar_url text, today_points int, notes text, items jsonb, leaderboard_visible boolean) as $$
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

-- ===== Лидерборд по категории (логика 018, границы периода — от «сегодня» участника) =====
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
            then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value,0))::int
          when m.type in ('number', 'sets')
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value,0))::int
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

-- ===== Идеальный стрик (логика 023, «сегодня» — по поясу пользователя) =====
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

  if not exists (
    select 1 from daily_values dv join metrics m on m.id = dv.metric_id
    where dv.user_id = target_user and m.active = true and dv.date = today_d
  ) then
    cursor_date := today_d - 1;
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

-- ===== Стрик по категории (логика 023, «сегодня» — по поясу пользователя) =====
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

  if not exists (
    select 1 from daily_values dv join metrics m on m.id = dv.metric_id
    where dv.user_id = target_user and m.category_id = cat_id and m.active = true and dv.date = today_d
  ) then
    cursor_date := today_d - 1;
  end if;

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
