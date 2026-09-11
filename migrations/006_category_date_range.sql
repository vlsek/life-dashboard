-- migrations/006_category_date_range.sql
-- Добавляет выбор периода в сравнении по категориям. Безопасно, только пересоздаёт
-- функцию чтения (с DROP FUNCTION перед этим — см. пояснение в 004).

drop function if exists get_category_leaderboard(text);
create or replace function get_category_leaderboard(cat_key text, days_back int default null)
returns table(user_id uuid, display_name text, avatar_url text, total_value numeric, category_points int, leaderboard_visible boolean, category_streak int) as $$
declare
  cat_id uuid;
  from_date date;
begin
  select id into cat_id from metric_categories where key = cat_key;
  from_date := case when days_back is null then '1900-01-01'::date else current_date - days_back end;

  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url,
    coalesce((
      select sum((dv.value)::numeric)
      from daily_values dv
      join metrics m on m.id = dv.metric_id and m.type = 'number' and m.category_id = cat_id
      where dv.user_id = p.user_id and m.active = true and dv.date >= from_date
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
      where dv.user_id = p.user_id and m.active = true and dv.date >= from_date
    ), 0)::int as category_points,
    p.leaderboard_visible,
    calc_category_streak(p.user_id, cat_key)
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;
grant execute on function get_category_leaderboard(text, int) to authenticated;
