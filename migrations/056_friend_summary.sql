-- 056_friend_summary.sql
-- Сообщество: сводка по другу при клике на него (BACKLOG 41 «8:51 — Сообщество: клик по другу показывает сводку по нему»;
-- ОТВЕТ ВЛАДЕЛЬЦА 2026-10-06: показывать БОЛЬШЕ, чем в рейтинге — достижения и ещё что-нибудь, дату регистрации).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- get_friend_summary(friend uuid) возвращает ОДИН jsonb-объект для друга (из get_friend_ids()) или для самого себя.
-- Чужие данные читаются только внутри функции (security definer) — прямого доступа к чужим таблицам нет, RLS не ослабляется.
-- Приватность: если друг скрыт из сообщества (profiles.leaderboard_visible = false — тот же переключатель, что у рейтинга, значков и рамок),
-- функция отдаёт только имя, аватар и даты (регистрация, «в друзьях с»), флаг hidden = true и НИКАКОЙ статистики.
-- Не друг и не ты — ошибка 42501 (ничего не отдаётся).
--
-- Поля: user_id, display_name, avatar_url, registered_at (auth.users.created_at), friends_since (когда приняли дружбу),
--   hidden, а для видимых: points_total (calc_user_points), points_week (баллы за ДНИ текущей недели, как в get_leaderboard_period),
--   perfect_streak (calc_perfect_streak), goals_done, active_days_30 (дней с записями за последние 30), favorite_exercise (название
--   упражнения с наибольшим числом записей), badges_count и badges (последние 8: key, unlocked_at; служебная '_baseline' не отдаётся), frame
--   (выбранная рамка — только если реально открыта у владельца, как в get_public_frames).
-- Существующие функции НЕ меняются. Откат: drop function get_friend_summary(uuid);

create or replace function get_friend_summary(friend uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  is_self boolean;
  vis boolean;
  td date;
  res jsonb;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  is_self := (friend = me);
  if not is_self and not exists (select 1 from get_friend_ids() fid where fid = friend) then
    raise exception 'not a friend' using errcode = '42501';
  end if;

  select coalesce(p.leaderboard_visible, false) into vis from profiles p where p.user_id = friend;
  td := user_today(friend);

  res := jsonb_build_object(
    'user_id', friend,
    'display_name', (select coalesce(nullif(p.display_name, ''), 'Пользователь ' || substring(friend::text, 1, 8)) from profiles p where p.user_id = friend),
    'avatar_url', (select p.avatar_url from profiles p where p.user_id = friend),
    'registered_at', (select u.created_at from auth.users u where u.id = friend),
    'friends_since', (
      select coalesce(f.responded_at, f.created_at) from friendships f
      where f.status = 'accepted'
        and least(f.requester_id, f.addressee_id) = least(me, friend)
        and greatest(f.requester_id, f.addressee_id) = greatest(me, friend)
    ),
    'hidden', (not is_self and not coalesce(vis, false))
  );

  if is_self or coalesce(vis, false) then
    res := res || jsonb_build_object(
      'points_total', calc_user_points(friend),
      'points_week', coalesce((
        select sum(calc_user_points_for_date(friend, d.dt))
        from (
          select distinct dv.date as dt from daily_values dv
          where dv.user_id = friend
            and dv.date between period_from(td, 'week') and period_to(td, 'week')
        ) d
      ), 0),
      'perfect_streak', calc_perfect_streak(friend),
      'goals_done', (select count(*) from goals g where g.user_id = friend and g.done = true),
      'active_days_30', (select count(distinct dv.date) from daily_values dv where dv.user_id = friend and dv.date > td - 30),
      'favorite_exercise', (
        select e.name from workout_entries w join workout_exercises e on e.id = w.exercise_id
        where w.user_id = friend group by e.name order by count(*) desc, e.name limit 1
      ),
      'badges_count', (select count(*) from user_achievements a where a.user_id = friend and a.key <> '_baseline'),
      'badges', coalesce((
        select jsonb_agg(jsonb_build_object('key', x.key, 'unlocked_at', x.unlocked_at))
        from (
          select a.key, a.unlocked_at from user_achievements a
          where a.user_id = friend and a.key <> '_baseline'
          order by a.unlocked_at desc nulls last, a.key limit 8
        ) x
      ), '[]'::jsonb),
      'frame', (
        select p.customization ->> 'avatar_frame' from profiles p
        join user_customizations c on c.user_id = p.user_id and c.item_key = (p.customization ->> 'avatar_frame')
        where p.user_id = friend
      )
    );
  end if;

  return res;
end;
$$;

grant execute on function get_friend_summary(uuid) to authenticated;
