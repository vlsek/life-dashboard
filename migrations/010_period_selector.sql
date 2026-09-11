-- migrations/010_period_selector.sql
-- Выбор периода "эта неделя / прошлая неделя / этот месяц / всё время" для сравнения
-- по категориям в Сообществе. Безопасно: пересоздаёт только функцию чтения.

drop function if exists get_category_leaderboard(text, int);
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
      select sum((dv.value)::numeric)
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.type = 'number' and m.category_id = cat_id
      where dv.user_id = p.user_id and m.active = true and dv.date between from_date and to_date
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
