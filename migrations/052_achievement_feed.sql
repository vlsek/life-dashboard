-- 052: лента достижений в Сообществе (BACKLOG 395, агент 6; решение владельца 2026-10-06: лента нужна, но человек САМ выбирает,
-- какие достижения в ней отражать — не больше 5; все остальные видны в раскрытом профиле, если он публичный).
-- Нужны миграции 039 (user_achievements) и 047 (публичные значки). Повторный запуск безопасен.
--
-- 1) profiles.feed_achievements — выбранные ключи значков (до 5). Ограничение «не больше 5» стоит в БД, а не только в клиенте.
--    Писать может только владелец строки (обычный RLS profiles), чужой список поменять нельзя.
-- 2) get_achievement_feed(p_days, p_limit) — события «открыто достижение» ТОЛЬКО по выбранным ключам и ТОЛЬКО по-настоящему открытым
--    (строка в user_achievements с датой): вписать вручную ключ, которого нет, — в ленту не попадёт. Показываем тех, кто виден в лидерборде
--    (profiles.leaderboard_visible = true — тот же переключатель, что у значков и рамок), и самого себя. Служебная '_baseline' и записи
--    без даты (достижение выполнено до появления раздела) в ленту не идут. Только чтение.
-- Откат: drop function get_achievement_feed(int, int); alter table profiles drop constraint profiles_feed_achievements_max5;
--        alter table profiles drop column feed_achievements;

alter table profiles add column if not exists feed_achievements text[] not null default '{}';

alter table profiles drop constraint if exists profiles_feed_achievements_max5;
alter table profiles add constraint profiles_feed_achievements_max5 check (cardinality(feed_achievements) <= 5);

create or replace function get_achievement_feed(p_days int default 30, p_limit int default 30)
returns table (user_id uuid, display_name text, avatar_url text, key text, unlocked_at timestamptz) as $$
begin
  return query
  select a.user_id, p.display_name, p.avatar_url, a.key, a.unlocked_at
  from user_achievements a
  join profiles p on p.user_id = a.user_id
  where a.key <> '_baseline'
    and a.unlocked_at is not null
    and a.unlocked_at >= now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365))
    and a.key = any (p.feed_achievements)
    and (a.user_id = auth.uid() or coalesce(p.leaderboard_visible, false) = true)
  order by a.unlocked_at desc, a.user_id, a.key
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$ language plpgsql security definer;

grant execute on function get_achievement_feed(int, int) to authenticated;
