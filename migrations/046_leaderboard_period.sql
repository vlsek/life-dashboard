-- 046: лидерборд по периодам для раздела «Сообщество» (BACKLOG 393, агент 2).
-- Решение владельца 2026-10-04: переключатель «Неделя / Месяц / Всё время» делаем с миграцией.
--
-- Новая ОТДЕЛЬНАЯ функция get_leaderboard_period(range_key): get_leaderboard() не трогаем (её переписывает 045 агента 1,
-- тип баллов int → numeric), поэтому здесь баллы сразу numeric и от смены типов в calc_user_points* ничего не ломается.
--   range_key: 'week' | 'last_week' | 'month' | 'all' (как в get_category_leaderboard; период считается от «сегодня» участника, user_today).
--   'all'    — как get_leaderboard(): calc_user_points (метрики + цели + навыки + книги).
--   остальные — только баллы за ДНИ периода (calc_user_points_for_date по датам, где есть значения). Цели, навыки и книги
--   в периодные баллы не входят: у них нет даты получения в схеме, задним числом их не разнести по неделям.
-- Приватность как раньше: leaderboard_visible возвращается, скрытых фильтрует клиент (leaderboardRows).
-- Миграция только добавляющая и безопасная при повторе. Откат: drop function get_leaderboard_period(text);

create or replace function get_leaderboard_period(range_key text default 'all')
returns table (user_id uuid, display_name text, avatar_url text, total_points numeric, perfect_streak int, leaderboard_visible boolean) as $$
begin
  return query
  select p.user_id,
         coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(p.user_id::text, 1, 8)),
         p.avatar_url,
         case
           when range_key in ('week', 'last_week', 'month') then
             coalesce((
               select sum(calc_user_points_for_date(p.user_id, d.dt))
               from (
                 select distinct dv.date as dt
                 from daily_values dv
                 where dv.user_id = p.user_id
                   and dv.date between period_from(t.td, range_key) and period_to(t.td, range_key)
               ) d
             ), 0)::numeric
           else calc_user_points(p.user_id)::numeric
         end as total_points,
         calc_perfect_streak(p.user_id),
         p.leaderboard_visible
  from profiles p
  cross join lateral (select user_today(p.user_id) as td) t
  order by 4 desc;
end;
$$ language plpgsql security definer;

grant execute on function get_leaderboard_period(text) to authenticated;
