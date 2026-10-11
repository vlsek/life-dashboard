-- 069_last_seen.sql
-- Профиль друга: «онлайн» / «был(а) N назад» (BACKLOG 48.2, пожелание владельца: «в раздел профиля друга добавим, когда был последний раз или вовсе онлайн»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). Пока миграция не применена, приложение молча ничего не показывает.
--
-- Что делает:
--   profiles.last_seen_at  — когда человек последний раз был в приложении (отметку ставит клиент не чаще раза в минуту, пока вкладка открыта);
--   profiles.show_online   — «показывать друзьям, что я в сети»; по умолчанию true, выключатель в «Настройках» шапки (ответ на вопрос «давать ли
--                            скрыть» — да, по умолчанию показывается ТОЛЬКО друзьям и отключается одним тумблером);
--   touch_last_seen()      — поставить себе отметку «сейчас» (не чаще раза в 60 с — лишних записей нет);
--   get_friends_presence() — отметки ТОЛЬКО друзей (get_friend_ids), у которых show_online включён, профиль виден в сообществе
--                            (leaderboard_visible, как у сводки друга — 056) и отметка есть. Не друг / скрыл / нет отметки — строки нет.
-- Приватность: чужие profiles напрямую не читаются (политика «own profile»), так что last_seen_at отдаётся только этой функцией и только друзьям.
-- Откат: drop function get_friends_presence(); drop function touch_last_seen(); alter table profiles drop column show_online, drop column last_seen_at;

alter table profiles add column if not exists last_seen_at timestamptz;
alter table profiles add column if not exists show_online boolean not null default true;
comment on column profiles.last_seen_at is 'Когда человек последний раз был в приложении (ставит touch_last_seen(), не чаще раза в минуту)';
comment on column profiles.show_online is 'Показывать друзьям «онлайн / был N назад» (BACKLOG 48.2); по умолчанию true';

create or replace function touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return; -- без входа отмечать некого; ошибка не нужна (вызывается из шапки на любой странице)
  end if;
  update profiles
     set last_seen_at = now()
   where user_id = auth.uid()
     and (last_seen_at is null or last_seen_at < now() - interval '60 seconds');
end;
$$;

create or replace function get_friends_presence()
returns table (user_id uuid, last_seen_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.user_id, p.last_seen_at
    from profiles p
   where p.user_id in (select get_friend_ids())
     and p.show_online = true
     and coalesce(p.leaderboard_visible, false)
     and p.last_seen_at is not null;
$$;

revoke all on function touch_last_seen() from public, anon;
revoke all on function get_friends_presence() from public, anon;
grant execute on function touch_last_seen() to authenticated;
grant execute on function get_friends_presence() to authenticated;
