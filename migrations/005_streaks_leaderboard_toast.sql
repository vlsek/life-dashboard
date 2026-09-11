-- migrations/005_streaks_leaderboard_toast.sql
-- Streak в лидерборде (общий и по категориям). Данные не трогает, только пересоздаёт
-- функции чтения — для этого их сначала приходится удалить (DROP), см. пояснение
-- в 004_leaderboard_privacy.sql.

drop function if exists calc_perfect_streak(uuid);
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
            when m.type = 'number' and m.goal_direction = 'at_most' then ((dv.value)::numeric > 0 and (dv.value)::numeric < coalesce(m.goal_value,0))
            when m.type = 'number' then ((dv.value)::numeric >= coalesce(m.goal_value,0))
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

drop function if exists calc_category_streak(uuid, text);
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
          when m.type = 'number' and m.goal_direction = 'at_most' then ((dv.value)::numeric > 0 and (dv.value)::numeric < coalesce(m.goal_value,0))
          when m.type = 'number' then ((dv.value)::numeric >= coalesce(m.goal_value,0))
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

drop function if exists get_leaderboard();
create or replace function get_leaderboard()
returns table (user_id uuid, display_name text, avatar_url text, total_points int, leaderboard_visible boolean, perfect_streak int) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url, calc_user_points(p.user_id), p.leaderboard_visible, calc_perfect_streak(p.user_id)
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;

drop function if exists get_category_leaderboard(text);
create or replace function get_category_leaderboard(cat_key text)
returns table(user_id uuid, display_name text, avatar_url text, total_value numeric, category_points int, leaderboard_visible boolean, category_streak int) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url,
    coalesce((
      select sum((dv.value)::numeric)
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.type = 'number'
        and m.category_id = (select id from metric_categories where key = cat_key)
      where dv.user_id = p.user_id and m.active = true
    ), 0)::numeric as total_value,
    coalesce((
      select sum(
        case
          when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
          when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
          when m.type = 'number' and m.goal_direction = 'at_most'
            then ((dv.value)::numeric > 0 and (dv.value)::numeric < coalesce(m.goal_value,0))::int
          when m.type = 'number'
            then ((dv.value)::numeric >= coalesce(m.goal_value,0))::int
          else 0
        end
      )
      from daily_values dv
      join metrics m on m.id = dv.metric_id
        and m.category_id = (select id from metric_categories where key = cat_key)
      where dv.user_id = p.user_id and m.active = true
    ), 0)::int as category_points,
    p.leaderboard_visible,
    calc_category_streak(p.user_id, cat_key)
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;

grant execute on function calc_perfect_streak(uuid) to authenticated;
grant execute on function calc_category_streak(uuid, text) to authenticated;
grant execute on function get_leaderboard() to authenticated;
grant execute on function get_category_leaderboard(text) to authenticated;
