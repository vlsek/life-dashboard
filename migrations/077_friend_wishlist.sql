-- 077: вишлист друга (BACKLOG 57.6, агент 1; ответ владельца 2026-10-12: «друг просто может посмотреть список, а дарение — в жизни»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен: create or replace).
--
-- get_friend_wishlist(friend uuid) возвращает ОДИН jsonb-объект: { hidden: bool, items: [ { id, name, link, image_url, cost, cost_sparks } ] }
-- для друга (из get_friend_ids()) или для самого себя. Только чтение: ни подарков, ни переводов, ни отметок «беру» нет.
-- В список попадают НЕКУПЛЕННЫЕ и неархивные вещи (redeemed = false, archived = false), сначала дешёвые.
-- Чужие данные читаются только внутри функции (security definer): RLS таблицы shop_items НЕ ослабляется, прямого доступа к чужому магазину нет.
-- Приватность — то же правило, что у get_friend_summary (056): если друг скрыт из сообщества (profiles.leaderboard_visible = false),
-- отдаётся { hidden: true, items: [] }. Не друг и не ты — ошибка 42501.
-- Откат: drop function get_friend_wishlist(uuid);

create or replace function get_friend_wishlist(friend uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  is_self boolean;
  vis boolean;
begin
  if me is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  is_self := (friend = me);
  if not is_self and not exists (select 1 from get_friend_ids() fid where fid = friend) then
    raise exception 'not a friend' using errcode = '42501';
  end if;

  select coalesce(p.leaderboard_visible, false) into vis from profiles p where p.user_id = friend;
  if not is_self and not coalesce(vis, false) then
    return jsonb_build_object('hidden', true, 'items', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'hidden', false,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'link', s.link,
        'image_url', s.image_url,
        'cost', s.cost,
        'cost_sparks', s.cost_sparks
      ) order by coalesce(s.cost_sparks, s.cost), s.name)
      from shop_items s
      where s.user_id = friend and not coalesce(s.redeemed, false) and not coalesce(s.archived, false)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function get_friend_wishlist(uuid) from public;
grant execute on function get_friend_wishlist(uuid) to authenticated;
