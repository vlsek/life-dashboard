-- ============================================================================
-- СВОДНЫЙ ФАЙЛ ОЖИДАЮЩИХ МИГРАЦИЙ (собран скриптом scripts/build_pending_migrations.py, руками не править)
-- Владелец подтвердил применение по 110 включительно — всё, что новее, ниже.
-- Состав (1 файлов): 1 миграций из раздела «Ждёт владельца» COORDINATION.md (пункты «применить миграцию …») + 0 «страховочных» миграций
-- каталога цен (*catalog*: только insert … on conflict do update — безопасны всегда; агенты не всегда вписывают их в «Ждёт владельца»,
-- а предмет без строки каталога купить нельзя: «неизвестный предмет»).
-- КАК ПРИМЕНЯТЬ: Supabase → SQL Editor → вставить ВЕСЬ этот файл → Run. Порядок — по номерам (так и требуют пункты «ПОСЛЕ NNN»).
-- Каждая миграция помечена агентом как «повтор безопасен», поэтому уже применённые проходят без вреда; при ошибке на каком-то месте
-- пришлите её текст и номер файла — после исправления файл можно запускать снова целиком.
-- ВНИМАНИЕ: миграции без пометки «ПОСЛЕ» всё равно идут строго по номерам; эти файлы дополняют уже применённые 001–056.
-- Список файлов:
--   111_goal_reward   [ждёт владельца]
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/111_goal_reward.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 111: «Магазин: награда за выполнение цели» (BACKLOG 68.2, срез 1; владелец одобрил предложение целиком 2026-10-28; агент 7).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). Применять после 057 и 077.
--
-- Идея: к СВОЕЙ хотелке Магазина человек привязывает СВОЮ ещё не выполненную цель из «Целей»; награду можно забрать, когда цель выполнена.
-- Это ещё один способ вместо цены в огоньках (переключатель «За огоньки / За цель»), баланс огоньков и монет при этом НЕ тратится.
--
-- Что делает миграция:
--  * shop_items.goal_id → goals(id) on delete set null (цель удалили — хотелка остаётся, привязки нет; клиент попросит задать цену или новую цель);
--    shop_items.reward_goal_name — название цели на момент получения (журнал помнит награду, даже если цель потом удалят).
--  * Триггер shop_items_goal_guard (срабатывает раньше sparks_guard 057 — по алфавиту): у вещи «за цель» cost_sparks = NULL и cost = 0, поэтому
--    ни одна формула баланса (огоньки, монеты, buy_customization, журнал) не тратит ничего. Цель обязана принадлежать тому же человеку (GR001);
--    привязать можно только НЕвыполненную цель (GR002); забрать награду (redeemed → true) можно только после выполнения цели (GR003);
--    у уже полученной награды цель менять нельзя (GR004). Проверка живёт в БАЗЕ, а не только в клиенте: прямой запрос redeemed = true
--    при невыполненной цели не пройдёт.
--  * claim_goal_reward(p_item_id, p_date) — «Получить награду»: ставит redeemed/redeemed_date, снимок названия цели; понятные коды ошибок
--    GR005 (награда не найдена/не ваша), GR006 (уже получена), GR003 (цель не выполнена). Работает с правами вызывающего (RLS «own shop_items»).
--  * goal_is_done(goals) — «цель выполнена»: как на клиенте (stages ≤ 1 → done; иначе current_stage ≥ stages).
--  * get_friend_wishlist (077) больше не показывает награды «за цель»: друг видит только то, что можно подарить (у такой вещи нет цены).
--
-- Откат: drop function claim_goal_reward(uuid, date); drop trigger shop_items_goal_guard on shop_items; drop function shop_items_goal_guard();
--        drop function goal_is_done(goals); alter table shop_items drop column goal_id, drop column reward_goal_name;
--        (get_friend_wishlist вернуть из 077.)
-- Проверка: scripts/sql_harness/run.sh 111 scenario_111_goal_reward.sql

alter table shop_items add column if not exists goal_id uuid references goals(id) on delete set null;
alter table shop_items add column if not exists reward_goal_name text;
create index if not exists shop_items_goal_id_idx on shop_items (goal_id) where goal_id is not null;

create or replace function goal_is_done(g goals) returns boolean
language sql stable as $$
  select case when coalesce(g.stages, 1) <= 1 then coalesce(g.done, false)
              else coalesce(g.current_stage, 0) >= g.stages end
$$;

create or replace function shop_items_goal_guard() returns trigger
language plpgsql as $$
declare
  v_goal goals%rowtype;
begin
  if new.goal_id is null then
    return new; -- обычная хотелка (или цель удалена каскадом set null) — как раньше
  end if;

  select * into v_goal from goals g where g.id = new.goal_id;
  if not found or v_goal.user_id is distinct from new.user_id then
    raise exception 'Цель не найдена' using errcode = 'GR001';
  end if;

  -- у уже полученной награды цель менять нельзя (обнуление при удалении цели — это goal_id → NULL, сюда не попадает)
  if tg_op = 'UPDATE' and coalesce(old.redeemed, false) and old.goal_id is distinct from new.goal_id then
    raise exception 'Награда уже получена' using errcode = 'GR004';
  end if;

  -- привязать можно только ещё не выполненную цель (иначе готовая цель дала бы награду даром)
  if (tg_op = 'INSERT' or old.goal_id is distinct from new.goal_id) and goal_is_done(v_goal) then
    raise exception 'Эта цель уже выполнена' using errcode = 'GR002';
  end if;

  -- забрать награду можно только после выполнения цели
  if coalesce(new.redeemed, false) and (tg_op = 'INSERT' or not coalesce(old.redeemed, false)) then
    if not goal_is_done(v_goal) then
      raise exception 'Сначала выполните цель' using errcode = 'GR003';
    end if;
    new.reward_goal_name := v_goal.name;
    new.redeemed_date := coalesce(new.redeemed_date, current_date);
  end if;

  -- вещь «за цель» ничего не стоит: ни огоньков, ни монет (цена в огоньках исключена, cost обнулён)
  new.cost_sparks := null;
  new.cost := 0;
  return new;
end;
$$;

drop trigger if exists shop_items_goal_guard on shop_items;
create trigger shop_items_goal_guard before insert or update on shop_items
  for each row execute function shop_items_goal_guard();

create or replace function claim_goal_reward(p_item_id uuid, p_date date default null)
returns table (item_id uuid, goal_name text, redeemed_date date)
language plpgsql set search_path = public as $$
declare
  v_item shop_items%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Нужно войти в аккаунт' using errcode = '28000';
  end if;
  select * into v_item from shop_items s where s.id = p_item_id and s.user_id = auth.uid() for update;
  if not found or v_item.goal_id is null and not coalesce(v_item.redeemed, false) then
    raise exception 'Награда не найдена' using errcode = 'GR005';
  end if;
  if coalesce(v_item.redeemed, false) then
    raise exception 'Награда уже получена' using errcode = 'GR006';
  end if;
  update shop_items s set redeemed = true, redeemed_date = coalesce(p_date, current_date) where s.id = p_item_id; -- GR003, если цель не выполнена
  return query select s.id, s.reward_goal_name, s.redeemed_date from shop_items s where s.id = p_item_id;
end;
$$;

revoke all on function claim_goal_reward(uuid, date) from public;
grant execute on function claim_goal_reward(uuid, date) to authenticated;

-- Вишлист друга: награды «за цель» не показываем (у них нет цены, подарить их нельзя). Тело — как в 077 плюс одно условие.
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
      where s.user_id = friend and not coalesce(s.redeemed, false) and not coalesce(s.archived, false) and s.goal_id is null
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function get_friend_wishlist(uuid) from public;
grant execute on function get_friend_wishlist(uuid) to authenticated;
