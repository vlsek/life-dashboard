-- 037_streak_from_yesterday.sql
-- Серия в Сообществе/лидерборде не должна обнуляться из-за незавершённого сегодняшнего дня (BACKLOG 22.1, серверная часть).
--
-- ДЕФЕКТ. calc_perfect_streak и calc_category_streak считали серию «от сегодня», как только за сегодня есть ЛЮБАЯ запись
-- (migrations/005, 018, 023, 030, 033). Стоило внести одну метрику за сегодня — серия начиналась с сегодняшнего дня, а он ещё
-- не «идеальный», и она обрывалась на нём: 0 вместо реальной серии «со вчера». На главной это выглядело как пропавший
-- (вместо пунктирного) огонёк, в Сообществе — как внезапно обнулившаяся серия.
--
-- ИСПРАВЛЕНИЕ. Если сегодняшний день ещё не засчитан (для идеального дня — не выполнены все нужные метрики; для категории —
-- нет ни одной выполненной), он не обрывает серию, а просто пропускается: серия считается от вчерашнего дня. Как только
-- сегодня засчитан — он входит в серию. Вчерашний и более ранние пропуски по-прежнему обрывают серию.
--
-- Только create or replace: сигнатуры и права не менялись, «сегодня» — по поясу пользователя (user_today, миграция 030),
-- цель метрики без значения — эффективная (metric_null_goal, миграция 033: норма воды). Определения взяты из 033, меняется
-- только обработка сегодняшнего дня.
-- Проверка: docs/sql-checks/037_streak_from_yesterday_check.sql.

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
              then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
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
            then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
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
