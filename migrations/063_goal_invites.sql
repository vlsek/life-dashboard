-- 063_goal_invites.sql
-- Друзья ставят друг другу ЦЕЛИ и ЗАДАЧИ (BACKLOG 41 «8:29 — Друзьям можно ставить задачи и цели»; ответы владельца 2026-10-06).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). Только добавляет; существующие данные не меняются.
--
-- Правила (всё от владельца, кроме отмеченного «агент»):
--   • Предложить можно только тому, кто в get_friend_ids(). Удалили из друзей — висящие предложения отменяются (триггер на friendships), новые не уйдут.
--   • Два вида: 'goal' (цель в «Целях» получателя) и 'task' (пункт в «Цели на сегодня» на дату plan_date — попадает в календарь).
--   • Получатель принимает или отклоняет. Принять = создаётся ЕГО копия (править её он может свободно). Баллы за цель НЕ задаёт отправитель:
--     их ставит существующий триггер 053 по сложности (5/10/15) — «дарить» баллы нельзя.
--   • Лимит предложений в день задаёт ПОЛУЧАТЕЛЬ: profiles.goal_invites_per_day (0 = не принимаю никаких; пусто = 10 в сутки — выбор агента).
--     Дополнительно (агент, от спама): не больше 5 ожидающих предложений от одного человека одному.
--   • Отправитель видит, что получатель принял/отклонил, и когда выполнил: completed_at ставят триггеры на goals (done) и daily_notes (done у пункта с invite_id).
--     «Уведомление»: get_goal_invites() отдаёт непрочитанное (answer_seen_at / completed_seen_at пусты), mark_goal_invite_seen() закрывает.
-- Запись в таблицу только через функции (security definer); читать свои записи могут обе стороны.
-- Откат: drop table goal_invites cascade; drop function send_goal_invite, respond_goal_invite, cancel_goal_invite, get_goal_invites, mark_goal_invite_seen;
--        alter table profiles drop column goal_invites_per_day; (триггеры уйдут вместе с функциями: drop function goal_invite_on_*)

alter table profiles add column if not exists goal_invites_per_day int;
do $$ begin
  alter table profiles add constraint profiles_goal_invites_per_day_chk check (goal_invites_per_day is null or goal_invites_per_day between 0 and 100);
exception when duplicate_object then null; end $$;

create table if not exists goal_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('goal', 'task')),
  name text not null check (char_length(name) between 1 and 120),
  stages int not null default 1 check (stages between 1 and 20),
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  deadline date,
  plan_date date,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  goal_id uuid references goals(id) on delete set null,
  completed_at timestamptz,
  answer_seen_at timestamptz,
  completed_seen_at timestamptz,
  constraint goal_invites_no_self check (sender_id <> recipient_id),
  constraint goal_invites_task_date check ((kind = 'task') = (plan_date is not null))
);
create index if not exists goal_invites_recipient_idx on goal_invites (recipient_id, status, created_at desc);
create index if not exists goal_invites_sender_idx on goal_invites (sender_id, created_at desc);
create index if not exists goal_invites_goal_idx on goal_invites (goal_id) where goal_id is not null;

alter table goal_invites enable row level security;
drop policy if exists "see own goal invites" on goal_invites;
create policy "see own goal invites" on goal_invites for select using (auth.uid() in (sender_id, recipient_id));
-- INSERT/UPDATE/DELETE-политик нет намеренно: запись только через функции ниже; сверх того права на запись у клиентских ролей отозваны.
revoke insert, update, delete on goal_invites from authenticated, anon;

-- ===== Предложить =====
create or replace function send_goal_invite(friend uuid, p_kind text, p_name text, p_stages int default 1, p_difficulty text default null,
                                            p_deadline date default null, p_plan_date date default null)
returns goal_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  nm text := btrim(coalesce(p_name, ''));
  lim int;
  today_cnt int;
  pending_cnt int;
  result goal_invites;
begin
  if me is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if friend is null or friend = me then raise exception 'cannot send to yourself' using errcode = '22023'; end if;
  if not exists (select 1 from get_friend_ids() f where f = friend) then
    raise exception 'not a friend' using errcode = '42501';
  end if;
  if p_kind not in ('goal', 'task') then raise exception 'bad kind' using errcode = '22023'; end if;
  if char_length(nm) = 0 or char_length(nm) > 120 then raise exception 'bad name' using errcode = '22023'; end if;
  if p_kind = 'task' and p_plan_date is null then raise exception 'task needs a date' using errcode = '22023'; end if;
  if p_kind = 'goal' then p_plan_date := null; else p_deadline := null; p_stages := 1; p_difficulty := null; end if;

  select coalesce(goal_invites_per_day, 10) into lim from profiles where user_id = friend;
  lim := coalesce(lim, 10);
  select count(*) into today_cnt from goal_invites
   where recipient_id = friend and created_at >= date_trunc('day', now());
  if today_cnt >= lim then raise exception 'recipient daily limit reached' using errcode = '53400'; end if;
  select count(*) into pending_cnt from goal_invites where sender_id = me and recipient_id = friend and status = 'pending';
  if pending_cnt >= 5 then raise exception 'too many pending invites' using errcode = '53400'; end if;

  insert into goal_invites (sender_id, recipient_id, kind, name, stages, difficulty, deadline, plan_date)
  values (me, friend, p_kind, nm, greatest(1, least(coalesce(p_stages, 1), 20)), p_difficulty, p_deadline, p_plan_date)
  returning * into result;
  return result;
end;
$$;

-- ===== Ответить =====
create or replace function respond_goal_invite(invite_id uuid, accept boolean)
returns goal_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inv goal_invites;
  gid uuid;
begin
  if me is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into inv from goal_invites where id = invite_id and recipient_id = me and status = 'pending' for update;
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;

  if accept then
    if inv.kind = 'goal' then
      insert into goals (user_id, name, stages, difficulty, deadline)  -- баллы выставит триггер 053 по сложности
      values (me, inv.name, inv.stages, inv.difficulty, inv.deadline) returning id into gid;
    else
      insert into daily_notes (user_id, date, planned_goals)
      values (me, inv.plan_date, jsonb_build_array(jsonb_build_object('type', 'custom', 'text', inv.name, 'done', false, 'invite_id', inv.id)))
      on conflict (user_id, date) do update
        set planned_goals = coalesce(daily_notes.planned_goals, '[]'::jsonb)
                            || jsonb_build_array(jsonb_build_object('type', 'custom', 'text', inv.name, 'done', false, 'invite_id', inv.id));
    end if;
    update goal_invites set status = 'accepted', responded_at = now(), goal_id = gid where id = inv.id returning * into inv;
  else
    update goal_invites set status = 'declined', responded_at = now() where id = inv.id returning * into inv;
  end if;
  return inv;
end;
$$;

-- ===== Отправитель отзывает ожидающее предложение =====
create or replace function cancel_goal_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  update goal_invites set status = 'cancelled', responded_at = now()
   where id = invite_id and sender_id = auth.uid() and status = 'pending';
end;
$$;

-- ===== Список для плашек и счётчика =====
-- incoming: все ожидающие мне. outgoing: мои ожидающие + то, о чём я ещё не прочитал ответ/выполнение (и всё за последние 14 дней).
create or replace function get_goal_invites()
returns table (
  id uuid, direction text, other_user_id uuid, other_name text, other_avatar text,
  kind text, name text, stages int, difficulty text, deadline date, plan_date date,
  status text, created_at timestamptz, responded_at timestamptz, completed_at timestamptz,
  unread boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id,
         case when i.recipient_id = auth.uid() then 'incoming' else 'outgoing' end,
         o.user_id, o.display_name, o.avatar_url,
         i.kind, i.name, i.stages, i.difficulty, i.deadline, i.plan_date,
         i.status, i.created_at, i.responded_at, i.completed_at,
         case when i.recipient_id = auth.uid() then i.status = 'pending'
              else (i.status in ('accepted', 'declined') and i.answer_seen_at is null)
                or (i.completed_at is not null and i.completed_seen_at is null) end
    from goal_invites i
    left join profiles o on o.user_id = case when i.recipient_id = auth.uid() then i.sender_id else i.recipient_id end
   where auth.uid() in (i.sender_id, i.recipient_id)
     and i.status <> 'cancelled'
     and (i.status = 'pending' or i.created_at > now() - interval '14 days')
   order by i.created_at desc
   limit 100;
$$;

create or replace function mark_goal_invite_seen(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  update goal_invites set answer_seen_at = coalesce(answer_seen_at, now()),
                          completed_seen_at = case when completed_at is not null then coalesce(completed_seen_at, now()) else completed_seen_at end
   where id = invite_id and sender_id = auth.uid();
end;
$$;

-- ===== Триггеры =====
-- Удалили из друзей -> ожидающие предложения между ними отменяются.
create or replace function goal_invite_on_unfriend() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update goal_invites set status = 'cancelled', responded_at = now()
   where status = 'pending'
     and ((sender_id = old.requester_id and recipient_id = old.addressee_id) or (sender_id = old.addressee_id and recipient_id = old.requester_id));
  return old;
end $$;
drop trigger if exists goal_invite_on_unfriend on friendships;
create trigger goal_invite_on_unfriend after delete on friendships for each row execute function goal_invite_on_unfriend();

-- Цель получателя выполнена / снова открыта -> completed_at у предложения.
create or replace function goal_invite_on_goal_done() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.done and not coalesce(old.done, false) then
    update goal_invites set completed_at = now(), completed_seen_at = null where goal_id = new.id and completed_at is null;
  elsif not new.done and coalesce(old.done, false) then
    update goal_invites set completed_at = null where goal_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists goal_invite_on_goal_done on goals;
create trigger goal_invite_on_goal_done after update of done on goals for each row execute function goal_invite_on_goal_done();

-- Задача на день (пункт плана с invite_id) отмечена done -> completed_at.
create or replace function goal_invite_on_note_done() returns trigger
language plpgsql security definer set search_path = public as $$
declare e jsonb; iid uuid;
begin
  if jsonb_typeof(new.planned_goals) <> 'array' then return new; end if;
  for e in select * from jsonb_array_elements(new.planned_goals) loop
    if jsonb_typeof(e) = 'object' and (e->>'invite_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      iid := (e->>'invite_id')::uuid;
      if (e->>'done') = 'true' then
        update goal_invites set completed_at = now(), completed_seen_at = null
         where id = iid and recipient_id = new.user_id and kind = 'task' and completed_at is null;
      else
        update goal_invites set completed_at = null where id = iid and recipient_id = new.user_id and kind = 'task';
      end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists goal_invite_on_note_done on daily_notes;
create trigger goal_invite_on_note_done after insert or update of planned_goals on daily_notes for each row execute function goal_invite_on_note_done();

revoke all on function send_goal_invite(uuid, text, text, int, text, date, date), respond_goal_invite(uuid, boolean), cancel_goal_invite(uuid),
  get_goal_invites(), mark_goal_invite_seen(uuid) from public;
grant execute on function send_goal_invite(uuid, text, text, int, text, date, date), respond_goal_invite(uuid, boolean), cancel_goal_invite(uuid),
  get_goal_invites(), mark_goal_invite_seen(uuid) to authenticated;
