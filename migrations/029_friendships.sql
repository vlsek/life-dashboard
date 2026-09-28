-- migrations/029_friendships.sql
--
-- Взаимная дружба с заявками (C2). БЕЗОПАСНО для базы с реальными пользователями:
-- только добавляет новую таблицу, индексы, политики и функции. Существующие таблицы
-- (в том числе `follows`) и их данные не трогаются и не удаляются.
-- Выполняется так же, как остальные: Supabase -> SQL Editor -> New query -> вставить -> Run.
-- Скрипт идемпотентен: повторный запуск ничего не ломает.
--
-- Как это соотносится с `follows` (миграция 001):
--   follows     — односторонняя подписка без согласия («как в Strava»), остаётся как есть.
--   friendships — взаимная дружба: заявка -> принятие. Друзья = только принятые записи.
-- Фронтенд пока продолжает использовать `follows`; переключение фильтра «Друзья» в
-- Сообществе на get_friend_ids() — отдельная задача (см. COORDINATION.md).
--
-- Модель безопасности: напрямую в таблицу писать нельзя (нет INSERT/UPDATE-политик),
-- все изменения идут через функции ниже (security definer), которые сами проверяют,
-- кто вызывает. Читать свои записи и удалять их (отмена заявки / отклонение / удаление
-- из друзей) может любая из двух сторон.

create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,  -- кто отправил заявку
  addressee_id uuid not null references auth.users(id) on delete cascade,  -- кому
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- Одна пара людей — не более одной записи, независимо от того, кто кому написал первым
-- (A->B и B->A считаются одной парой).
create unique index if not exists friendships_pair_uniq
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on friendships (addressee_id, status);
create index if not exists friendships_requester_idx on friendships (requester_id, status);

alter table friendships enable row level security;
drop policy if exists "see own friendships" on friendships;
drop policy if exists "delete own friendships" on friendships;
create policy "see own friendships" on friendships for select
  using (auth.uid() in (requester_id, addressee_id));
create policy "delete own friendships" on friendships for delete
  using (auth.uid() in (requester_id, addressee_id));
-- INSERT/UPDATE-политик нет намеренно: запись только через функции ниже.

-- ===== Отправить заявку =====
-- Если человек уже отправил заявку МНЕ — это встречная заявка, и дружба сразу принимается.
-- Повторная заявка тому же человеку или заявка тому, кто уже друг, ничего не дублирует
-- и просто возвращает существующую запись.
create or replace function send_friend_request(target uuid)
returns friendships
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing friendships;
  result friendships;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if target is null or target = me then
    raise exception 'cannot send a friend request to yourself' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = target) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  select * into existing from friendships f
   where least(f.requester_id, f.addressee_id) = least(me, target)
     and greatest(f.requester_id, f.addressee_id) = greatest(me, target);

  if found then
    if existing.status = 'pending' and existing.addressee_id = me then
      -- встречная заявка: принимаем
      update friendships set status = 'accepted', responded_at = now()
       where id = existing.id returning * into result;
      return result;
    end if;
    return existing;
  end if;

  begin
    insert into friendships (requester_id, addressee_id) values (me, target) returning * into result;
  exception when unique_violation then
    -- гонка: обе стороны отправили одновременно; берём то, что успело записаться
    select * into result from friendships f
     where least(f.requester_id, f.addressee_id) = least(me, target)
       and greatest(f.requester_id, f.addressee_id) = greatest(me, target);
  end;
  return result;
end;
$$;

-- ===== Ответить на входящую заявку =====
-- accept = true  -> дружба принята (запись остаётся со статусом accepted)
-- accept = false -> заявка отклонена (запись удаляется, можно отправить новую позже)
-- Отвечать может только адресат и только на pending-заявку.
create or replace function respond_friend_request(request_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  updated int;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if accept then
    update friendships set status = 'accepted', responded_at = now()
     where id = request_id and addressee_id = me and status = 'pending';
  else
    delete from friendships
     where id = request_id and addressee_id = me and status = 'pending';
  end if;
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'friend request not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ===== Удалить из друзей / отменить свою заявку =====
-- Через DELETE по политике выше это можно и напрямую с клиента; функция — для удобства
-- и единообразия (принимает id другого человека, а не id записи).
create or replace function remove_friend(other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  delete from friendships f
   where least(f.requester_id, f.addressee_id) = least(me, other)
     and greatest(f.requester_id, f.addressee_id) = greatest(me, other);
end;
$$;

-- ===== id всех моих друзей (только принятые) =====
create or replace function get_friend_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from friendships f
   where f.status = 'accepted'
     and auth.uid() in (f.requester_id, f.addressee_id);
$$;

-- ===== Мои ожидающие заявки (входящие и исходящие) с именем и аватаром =====
create or replace function get_friend_requests()
returns table (
  id uuid,
  other_user_id uuid,
  display_name text,
  avatar_url text,
  direction text,        -- 'incoming' (мне) | 'outgoing' (от меня)
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id,
         case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end,
         coalesce(p.display_name, 'Без имени'),
         p.avatar_url,
         case when f.requester_id = auth.uid() then 'outgoing' else 'incoming' end,
         f.created_at
    from friendships f
    left join profiles p
      on p.user_id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
   where f.status = 'pending'
     and auth.uid() in (f.requester_id, f.addressee_id)
   order by f.created_at desc;
$$;

-- Функции доступны только вошедшим пользователям (не anon).
revoke all on function send_friend_request(uuid) from public, anon;
revoke all on function respond_friend_request(uuid, boolean) from public, anon;
revoke all on function remove_friend(uuid) from public, anon;
revoke all on function get_friend_ids() from public, anon;
revoke all on function get_friend_requests() from public, anon;
grant execute on function send_friend_request(uuid) to authenticated;
grant execute on function respond_friend_request(uuid, boolean) to authenticated;
grant execute on function remove_friend(uuid) to authenticated;
grant execute on function get_friend_ids() to authenticated;
grant execute on function get_friend_requests() to authenticated;

-- Необязательно, НЕ выполняется автоматически: превратить существующие ВЗАИМНЫЕ подписки
-- (A подписан на B и B подписан на A) в принятые дружбы. Раскомментируй и выполни один раз,
-- если хочешь, чтобы уже сложившиеся пары сразу стали друзьями.
-- insert into friendships (requester_id, addressee_id, status, responded_at)
-- select a.follower_id, a.followed_id, 'accepted', now()
--   from follows a
--   join follows b on b.follower_id = a.followed_id and b.followed_id = a.follower_id
--  where a.follower_id < a.followed_id
-- on conflict do nothing;
