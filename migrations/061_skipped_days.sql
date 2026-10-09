-- 061: пропуск дня метрики без разрыва серии (BACKLOG 47.3, агент 6).
-- Владелец (2026-10-07): в начале нового дня показывается окно со вчерашними метриками, которые не выполнены или могут прервать серию; у каждой — «пропустить»
-- = НЕ учитывать этот день: серия не рвётся и не растёт, день для этой метрики считается «не обязательным» (как день вне расписания, миграция 023).
-- Механизма пропуска в проекте не было, поэтому:
--  * `metrics.skipped_days date[]` — даты, которые пропущены для этой метрики. Метрики страницы и так загружают целиком (`select *`), поэтому поле приезжает без новых запросов;
--  * клиентская `metricExpectedOn(m, дата)` проверяет это поле, а здесь — серверные расчёты серий (`calc_perfect_streak` для лидерборда/достижений и `calc_category_streak` для
--    сравнения по категориям): пропущенный день = `metric_expected_on(...)` ложь. Тексты функций — ТОЧНЫЕ копии редакции 044 с одной добавкой в трёх местах;
--  * ЗАЩИТА (чтобы серию нельзя было «нарисовать» прямым запросом): триггер разрешает добавлять и снимать даты ТОЛЬКО за вчера и сегодня (по часовому поясу пользователя);
--    записанные раньше пропуски менять нельзя; при создании метрики список пуст. Ограничение размера не нужно: окно — два дня.
-- Баллы не затронуты (нет значения — нет баллов). Повторный запуск безопасен. Нужны: 021/023 (расписание), 044, функция `user_today`.
-- Откат: восстановить функции из 044; drop trigger metrics_skipped_days_guard on metrics; drop function metrics_skipped_days_guard(); alter table metrics drop column skipped_days;

alter table metrics add column if not exists skipped_days date[] not null default '{}';

create or replace function metrics_skipped_days_guard()
returns trigger as $$
declare
  v_today date;
  v_from date;
  d date;
begin
  if tg_op = 'INSERT' then
    if coalesce(array_length(new.skipped_days, 1), 0) > 0 then
      raise exception 'skipped_days_not_empty_on_insert' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.skipped_days is not distinct from old.skipped_days then return new; end if;
  v_today := user_today(new.user_id);
  v_from := v_today - 1;
  -- добавленные даты — только вчера/сегодня
  for d in select x from unnest(coalesce(new.skipped_days, '{}'::date[])) x where not (x = any (coalesce(old.skipped_days, '{}'::date[]))) loop
    if d < v_from or d > v_today then
      raise exception 'skip_out_of_window' using errcode = 'P0001';
    end if;
  end loop;
  -- снятые даты — тоже только вчера/сегодня (старые пропуски — история, их не трогаем)
  for d in select x from unnest(coalesce(old.skipped_days, '{}'::date[])) x where not (x = any (coalesce(new.skipped_days, '{}'::date[]))) loop
    if d < v_from or d > v_today then
      raise exception 'skip_out_of_window' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$ language plpgsql;

drop trigger if exists metrics_skipped_days_guard on metrics;
create trigger metrics_skipped_days_guard before insert or update of skipped_days on metrics
  for each row execute function metrics_skipped_days_guard();

-- ===== серии с учётом пропуска (копии 044 + `and not (cursor_date = any (m.skipped_days))`) =====
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
    where m.user_id = target_user and m.active = true and metric_expected_on(m.schedule, cursor_date) and not (cursor_date = any (m.skipped_days));

    -- день, когда по расписанию ничего не нужно: серию не рвёт и не увеличивает
    if expected_cnt = 0 then
      cursor_date := cursor_date - 1;
      continue;
    end if;

    if exists (
      select 1 from metrics m
      where m.user_id = target_user and m.active = true
      and metric_expected_on(m.schedule, cursor_date) and not (cursor_date = any (m.skipped_days))
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
      and metric_expected_on(m.schedule, cursor_date) and not (cursor_date = any (m.skipped_days));

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
