-- 023_leaderboard_schedule.sql
--
-- Серии в лидерборде и в сравнении по категориям теперь учитывают расписание метрик
-- (metrics.schedule, миграция 021) так же, как приложение:
--   * метрика "только в выбранные дни недели" не нужна в остальные дни — эти дни серию не рвут;
--   * метрика "не менее N раз в неделю" в "идеальный день" не входит;
--   * день, когда по расписанию не нужна ни одна метрика, серию не рвёт и не считается.
-- Метрики без расписания (schedule is null) работают ровно как раньше.
-- Баллы и остальные функции не меняются.

-- Нужна ли метрика с таким расписанием именно в эту дату (день недели: 0 = воскресенье, как в JS)
create or replace function metric_expected_on(sched jsonb, d date)
returns boolean as $$
begin
  if sched is null or jsonb_typeof(sched) <> 'object' then return true; end if;

  if sched->>'type' = 'days'
     and jsonb_typeof(sched->'days') = 'array'
     and jsonb_array_length(sched->'days') between 1 and 6 then
    return exists (
      select 1 from jsonb_array_elements_text(sched->'days') x
      where x::int = extract(dow from d)::int
    );
  end if;

  if sched->>'type' = 'weekly' and coalesce((sched->>'min')::numeric, 0) >= 1 then
    return false; -- не привязана к конкретному дню
  end if;

  return true;
end;
$$ language plpgsql immutable;

grant execute on function metric_expected_on(jsonb, date) to authenticated;

-- ===== Streak "идеальных дней" с учётом расписания =====
create or replace function calc_perfect_streak(target_user uuid)
returns int as $$
declare
  streak int := 0;
  iterations int := 0;
  cursor_date date := current_date;
  expected_cnt int;
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

-- ===== Streak по категории с учётом расписания =====
create or replace function calc_category_streak(target_user uuid, cat_key text)
returns int as $$
declare
  streak int := 0;
  iterations int := 0;
  cursor_date date := current_date;
  cat_id uuid;
  expected_cnt int;
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
