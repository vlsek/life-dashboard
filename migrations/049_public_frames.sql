-- 049: рамки аватарок других людей в Сообществе (BACKLOG 491, агент 2). Нужна миграция 048 (profiles.customization, user_customizations).
-- get_public_frames(): выбранная рамка аватарки (user_id, frame) для ТЕКУЩЕГО пользователя и для тех, кто виден в лидерборде
-- (profiles.leaderboard_visible = true — тот же переключатель приватности, что у значков, отдельной настройки нет).
-- Рамка отдаётся только если предмет РЕАЛЬНО открыт у владельца (есть строка в user_customizations): выбор пишет клиент в jsonb,
-- поэтому без этой проверки можно было бы «надеть» чужую платную рамку, вписав ключ руками. Только чтение; безопасна при повторе.
-- Откат: drop function get_public_frames();

create or replace function get_public_frames()
returns table (user_id uuid, frame text) as $$
begin
  return query
  select p.user_id, (p.customization ->> 'avatar_frame')
  from profiles p
  join user_customizations c on c.user_id = p.user_id and c.item_key = (p.customization ->> 'avatar_frame')
  where (p.user_id = auth.uid() or coalesce(p.leaderboard_visible, false) = true);
end;
$$ language plpgsql security definer;

grant execute on function get_public_frames() to authenticated;
