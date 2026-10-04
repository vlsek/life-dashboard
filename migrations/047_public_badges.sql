-- 047: значки достижений в Сообществе (BACKLOG 393, третий срез, агент 2; решение владельца 2026-10-04: чужие значки показывать).
-- Таблица user_achievements (039) читается RLS-ом только владельцем строк, поэтому чужие значки отдаёт отдельная функция.
-- get_public_badges(): строки достижений (user_id, key, unlocked_at) для ТЕКУЩЕГО пользователя и для тех, кто виден в лидерборде
-- (profiles.leaderboard_visible = true — тот же переключатель «показывать меня в сообществе», отдельной настройки нет).
-- Служебная строка '_baseline' не отдаётся. Только чтение, ничего не меняет; безопасна при повторном запуске.
-- Откат: drop function get_public_badges();

create or replace function get_public_badges()
returns table (user_id uuid, key text, unlocked_at timestamptz) as $$
begin
  return query
  select a.user_id, a.key, a.unlocked_at
  from user_achievements a
  left join profiles p on p.user_id = a.user_id
  where a.key <> '_baseline'
    and (a.user_id = auth.uid() or coalesce(p.leaderboard_visible, false) = true)
  order by a.user_id, a.unlocked_at desc nulls last, a.key;
end;
$$ language plpgsql security definer;

grant execute on function get_public_badges() to authenticated;
