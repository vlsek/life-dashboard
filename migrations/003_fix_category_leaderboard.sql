-- migrations/003_fix_category_leaderboard.sql
--
-- Фикс бага "structure of query does not match function result type" в сравнении
-- по категориям в Сообществе. Причина: SUM() над целыми числами в Postgres всегда
-- возвращает bigint, а функция была объявлена как возвращающая int — несовпадение типов.
-- БЕЗОПАСНО: просто переопределяет функцию, данные не трогает.

create or replace function get_category_leaderboard(cat_key text)
returns table(user_id uuid, display_name text, avatar_url text, category_points int) as $$
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
    ), 0)::int as category_points
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;
grant execute on function get_category_leaderboard(text) to authenticated;
