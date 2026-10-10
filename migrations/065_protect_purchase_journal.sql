-- 065: охрана журнала покупок Кастомизации (BACKLOG 47.6, срез 4; аудит docs/SECURITY_AUDIT_47_6.md, находка №4).
-- Дыра: «потрачено» хранится строками shop_items (redeemed = true), а политика владельца даёт менять и удалять их с клиента.
-- Достаточно удалить свою строку о покупке рамки/темы — монеты «вернулись», а предмет (user_customizations) остался.
-- Исправление: строки, созданные серверной покупкой buy_customization, помечены shop_items.source = 'customization';
-- ролям приложения (authenticated, anon) такую строку нельзя ни изменить, ни удалить, ни создать. Желания Магазина
-- (обычные строки, source IS NULL) работают как раньше — это личные цели пользователя, их цену и пометку «куплено» он задаёт сам.
-- Старые покупки (до 065) помечаются по тому же префиксу, который уже использует магазин: «Кастомизация:» / «Customization:».
-- SQL Editor, функции SECURITY DEFINER и каскад при удалении аккаунта работают не под ролями приложения и охрану не задевают.
-- Применять после 060. Повторный запуск безопасен.
-- Откат: drop trigger shop_items_purchase_guard on shop_items; drop function shop_items_purchase_guard(); alter table shop_items drop column source;
--        (buy_customization вернуть из 060.)
-- Проверка: scripts/sql_harness/scenario_065_purchase_journal.sql и scenario_audit_security.sql.

alter table shop_items add column if not exists source text;

-- Пометка старых покупок Кастомизации (это выполняется владельцем БД, охранный триггер ещё не создан)
update shop_items
   set source = 'customization'
 where source is null
   and coalesce(redeemed, false)
   and (ltrim(name) like 'Кастомизация:%' or ltrim(name) like 'Customization:%');

-- Серверная покупка теперь сама помечает строку списания (тело — как в 060, плюс колонка source)
create or replace function buy_customization(p_item_key text, p_label text default null)
returns table (item text, spent int, new_balance numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cat customization_catalog%rowtype;
  v_balance numeric;
begin
  if v_user is null then
    raise exception 'Нужно войти в аккаунт' using errcode = '28000';
  end if;
  select * into v_cat from customization_catalog c where c.item_key = p_item_key;
  if not found then
    raise exception 'Неизвестный предмет' using errcode = 'CU002';
  end if;
  if v_cat.source <> 'points' or v_cat.price is null then
    raise exception 'Этот предмет не продаётся' using errcode = 'CU003';
  end if;
  if not exists (select 1 from profiles p where p.user_id = v_user) then
    raise exception 'Профиль не найден' using errcode = 'CU005';
  end if;

  -- Одна покупка за раз на пользователя: вторая вкладка/двойное нажатие ждёт и увидит уже готовый результат.
  perform pg_advisory_xact_lock(hashtext('coins:' || v_user::text));

  if exists (select 1 from user_customizations uc where uc.user_id = v_user and uc.item_key = p_item_key) then
    raise exception 'Предмет уже куплен' using errcode = '23505';
  end if;

  v_balance := round(
    calc_user_points(v_user)
    + coalesce((select sum(b.coins) from achievement_bonuses b where b.user_id = v_user), 0)
    - coalesce((select sum(s.cost) from shop_items s where s.user_id = v_user and coalesce(s.redeemed, false)), 0),
    1);
  if v_balance < v_cat.price then
    raise exception 'Не хватает баллов' using errcode = 'CU004';
  end if;

  insert into user_customizations (user_id, item_key, source) values (v_user, p_item_key, 'points');
  insert into shop_items (user_id, name, cost, redeemed, redeemed_date, source)
  values (v_user, coalesce(nullif(left(btrim(p_label), 120), ''), p_item_key), v_cat.price, true, user_today(v_user), 'customization');

  return query select p_item_key, v_cat.price, round(v_balance - v_cat.price, 1);
end $$;

create or replace function claim_achievement_items()
returns setof text
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Нужно войти в аккаунт' using errcode = '28000';
  end if;
  return query
  insert into user_customizations (user_id, item_key, source)
  select v_user, c.item_key, 'achievement'
  from customization_catalog c
  where c.source = 'achievement'
    and exists (select 1 from user_achievements a where a.user_id = v_user and a.key = c.achievement_key)
  on conflict (user_id, item_key) do nothing
  returning user_customizations.item_key;
end $$;

revoke all on function buy_customization(text, text) from public, anon;
grant execute on function buy_customization(text, text) to authenticated;

create or replace function shop_items_purchase_guard() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.source := null; -- пометку ставит только сервер; клиентская строка всегда «обычная»
      return new;
    elsif tg_op = 'UPDATE' then
      if old.source is not null or new.source is distinct from old.source then
        raise exception 'Запись о покупке Кастомизации менять нельзя' using errcode = '42501';
      end if;
      return new;
    else
      if old.source is not null then
        raise exception 'Запись о покупке Кастомизации удалять нельзя' using errcode = '42501';
      end if;
      return old;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists shop_items_purchase_guard on shop_items;
create trigger shop_items_purchase_guard
  before insert or update or delete on shop_items
  for each row execute function shop_items_purchase_guard();
