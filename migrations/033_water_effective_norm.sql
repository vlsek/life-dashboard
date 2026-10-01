-- 033_water_effective_norm.sql
-- Вода «выполнена» по ЭФФЕКТИВНОЙ норме, а не по coalesce(goal_value, 0) (решение владельца 2026-10-01, вариант «б»).
--
-- ПРОБЛЕМА. У метрики воды норма может быть не записана (metrics.goal_value IS NULL) — тогда клиент берёт «авто-норму»:
-- вес × 30 мл, а без веса 2000 мл (web-dashboard/src/lib/water.ts, effectiveNormMl). Все SQL-функции баллов, лидерборда и
-- стриков считали по coalesce(m.goal_value, 0), то есть при пустой норме балл за воду давало ЛЮБОЕ записанное значение,
-- даже 100 мл.
--
-- РЕШЕНИЕ. Правило «норма воды» живёт в одном месте — metric_null_goal(): если у метрики goal_value пустой, она — вода
-- пользователя, число и значение авто-нормы есть, то нормой считается авто-норма; иначе 0, как раньше. Если goal_value
-- задан (ручная норма, «Изменить дневную норму» в Дашборде) — он главнее, поведение не меняется. Для всех остальных
-- метрик с пустой целью ничего не меняется. Пять функций переписаны с coalesce(m.goal_value,0) на
-- coalesce(m.goal_value, metric_null_goal(...)): calc_user_points, calc_user_points_for_date, calc_perfect_streak,
-- calc_category_streak, get_category_leaderboard. Остальное в них — как было (018 и 030), сигнатуры не менялись.
-- Лидерборд (get_leaderboard) и «активность сегодня» (get_today_activity) вызывают эти функции — подхватят сами.
--
-- КАК ОПОЗНАЁТСЯ ВОДА И ВЕС (то же, что на клиенте — findWaterMetric / findWeightParam):
--   вода — активная метрика типа number с иконкой-каплей (svg:droplet, 💧, 💦) ИЛИ названием, содержащим «вода»/«water»;
--          если таких несколько — первая по position, затем по id (как в списке Дашборда);
--   вес  — параметр тела с иконкой весов (svg:scale, ⚖) ИЛИ названием, содержащим «вес»/«weight»; берётся его последнее по
--          дате значение (как useWater.loadAutoNorm); значение 0 или пусто = веса нет → 2000 мл.
--   авто-норма = round(вес × 30).
--
-- ПОСЛЕДСТВИЯ (важно знать владельцу):
--   • Баллы за воду у людей с пустой нормой пересчитаются ЗАДНИМ ЧИСЛОМ: дни с малым количеством воды перестанут давать +1,
--     общий баланс у таких пользователей может уменьшиться. «Идеальные дни»/стрики, где вода была ниже нормы, тоже.
--   • Авто-норма считается по ПОСЛЕДНЕМУ весу, а не по весу на тот день (как и показывает сам Дашборд): сменился вес —
--     поменялась норма и для прошлых дней. Чтобы зафиксировать норму, достаточно задать её вручную («Изменить дневную норму»).
--
-- Миграция только добавляющая и безопасная при повторном применении (create or replace). Помощники закрыты от прямого
-- вызова (revoke): иначе через security definer любой вошедший мог бы узнать чужую авто-норму, то есть вес. Рабочие функции
-- тоже security definer, поэтому на них закрытие не влияет.
-- Откат: вернуть определения из 018 (calc_user_points, calc_user_points_for_date) и 030 (остальные три).
-- Проверка после применения — docs/sql-checks/033_water_effective_norm_check.sql.

-- ===== Опознание воды и веса (как на клиенте) =====
create or replace function is_water_like(m_icon text, m_name text)
returns boolean as $$
  select regexp_replace(btrim(coalesce(m_icon, '')), E'\uFE0F', '', 'g') in ('svg:droplet', '💧', '💦')
      or lower(coalesce(m_name, '')) ~ '(вода|water)';
$$ language sql immutable;

create or replace function is_weight_like(p_icon text, p_name text)
returns boolean as $$
  select regexp_replace(btrim(coalesce(p_icon, '')), E'\uFE0F', '', 'g') in ('svg:scale', '⚖')
      or lower(coalesce(p_name, '')) ~ '(вес|weight)';
$$ language sql immutable;

-- ===== Авто-норма воды по последнему весу: round(вес × 30); нет веса / вес 0 → null =====
create or replace function water_auto_norm_ml(target_user uuid)
returns numeric as $$
declare
  param_id uuid;
  w numeric;
begin
  select bp.id into param_id
  from body_parameters bp
  where bp.user_id = target_user and is_weight_like(bp.icon, bp.name)
  order by bp.position nulls last, bp.id
  limit 1;
  if param_id is null then return null; end if;

  select v.value into w
  from body_parameter_values v
  where v.user_id = target_user and v.parameter_id = param_id
  order by v.date desc
  limit 1;
  if coalesce(w, 0) = 0 then return null; end if;
  return round(w * 30);
end;
$$ language plpgsql stable security definer;

-- ===== Норма метрики с ПУСТЫМ goal_value: для воды — авто-норма (или 2000), для остальных 0, как раньше =====
create or replace function metric_null_goal(m_id uuid, m_user uuid, m_type text, m_name text, m_icon text)
returns numeric as $$
begin
  if m_type <> 'number' or not is_water_like(m_icon, m_name) then return 0; end if;
  -- Только «главная» вода пользователя (первая по position), как findWaterMetric на клиенте.
  if m_id is distinct from (
    select w.id from metrics w
    where w.user_id = m_user and w.active = true and w.type = 'number' and is_water_like(w.icon, w.name)
    order by w.position nulls last, w.id
    limit 1
  ) then
    return 0;
  end if;
  return coalesce(water_auto_norm_ml(m_user), 2000);
end;
$$ language plpgsql stable security definer;

revoke all on function is_water_like(text, text) from public, anon, authenticated;
revoke all on function is_weight_like(text, text) from public, anon, authenticated;
revoke all on function water_auto_norm_ml(uuid) from public, anon, authenticated;
revoke all on function metric_null_goal(uuid, uuid, text, text, text) from public, anon, authenticated;

-- ===== Пять функций: coalesce(m.goal_value,0) → coalesce(m.goal_value, metric_null_goal(...)) =====

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
        then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))::int
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
        then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))::int
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
              then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
            when m.type in ('number', 'sets')
              then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
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
            then (metric_numeric_value(m.type, dv.value) > 0 and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
          when m.type in ('number', 'sets')
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
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
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))::int
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
