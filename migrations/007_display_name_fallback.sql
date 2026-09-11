-- migrations/007_display_name_fallback.sql
-- Разные пользователи без имени раньше показывались одинаково как "Без имени" — не
-- различить в списках. Теперь у каждого свой короткий идентификатор вместо общей заглушки.
-- Безопасно: только пересоздаёт функции чтения (с DROP перед этим, см. пояснение в 004).

drop function if exists get_leaderboard();
create or replace function get_leaderboard()
returns table (user_id uuid, display_name text, avatar_url text, total_points int, perfect_streak int, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id,
         coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
         p.avatar_url, calc_user_points(p.user_id), calc_perfect_streak(p.user_id), p.leaderboard_visible
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;
grant execute on function get_leaderboard() to authenticated;

drop function if exists get_today_activity();
create or replace function get_today_activity()
returns table (user_id uuid, display_name text, avatar_url text, today_points int, notes text, items jsonb, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id,
         coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
         p.avatar_url, calc_user_points_for_date(p.user_id, current_date),
         dn.notes, dn.items, p.leaderboard_visible
  from profiles p
  left join daily_notes dn on dn.user_id = p.user_id and dn.date = current_date
  order by 4 desc;
end;
$$ language plpgsql security definer;
grant execute on function get_today_activity() to authenticated;

drop function if exists get_category_leaderboard(text, int);
create or replace function get_category_leaderboard(cat_key text, days_back int default null)
returns table(user_id uuid, display_name text, avatar_url text, total_value numeric, category_points int, leaderboard_visible boolean, category_streak int) as $$
declare
  cat_id uuid;
  from_date date;
begin
  select id into cat_id from metric_categories where key = cat_key;
  from_date := case when days_back is null then '1900-01-01'::date else current_date - days_back end;

  return query
  select p.user_id,
    coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
    p.avatar_url,
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
