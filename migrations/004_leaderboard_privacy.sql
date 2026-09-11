-- migrations/004_leaderboard_privacy.sql
-- Возможность скрыть себя из лидербордов/ленты сообщества. Безопасно для данных —
-- только добавляет колонки. Функции приходится удалять перед пересозданием (см. DROP
-- FUNCTION ниже) потому что Postgres не разрешает поменять набор возвращаемых колонок
-- через CREATE OR REPLACE — это нормально, из-за этого данные не страдают, только сама
-- функция-обёртка для чтения пересоздаётся.

alter table profiles add column if not exists leaderboard_visible boolean default true;
alter table profiles add column if not exists dashboard_charts jsonb;
alter table daily_notes add column if not exists items jsonb default '[]'::jsonb;

drop function if exists get_leaderboard();
create or replace function get_leaderboard()
returns table (user_id uuid, display_name text, avatar_url text, total_points int, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url, calc_user_points(p.user_id), p.leaderboard_visible
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;

drop function if exists get_today_activity();
create or replace function get_today_activity()
returns table (user_id uuid, display_name text, avatar_url text, today_points int, notes text, items jsonb, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url,
         calc_user_points_for_date(p.user_id, current_date),
         dn.notes, dn.items, p.leaderboard_visible
  from profiles p
  left join daily_notes dn on dn.user_id = p.user_id and dn.date = current_date
  order by 4 desc;
end;
$$ language plpgsql security definer;

drop function if exists get_category_leaderboard(text);
create or replace function get_category_leaderboard(cat_key text)
returns table(user_id uuid, display_name text, avatar_url text, category_points int, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url,
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
    p.leaderboard_visible
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;

grant execute on function get_leaderboard() to authenticated;
grant execute on function get_today_activity() to authenticated;
grant execute on function get_category_leaderboard(text) to authenticated;
