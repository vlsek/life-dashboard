-- 060: серверная покупка предметов «Кастомизации» (BACKLOG 47.6, срез 2; аудит агента 1, docs/SECURITY_AUDIT_47_6.md, находки №3, №5, №6).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 059 (одним запуском; повторный запуск безопасен).
--
-- ПРОБЛЕМА. Покупка шла с клиента в два шага без транзакции: вставка строки в user_customizations, затем вставка «списания» в shop_items (при ошибке — откат
-- вторым запросом). Политика «own user_customizations» (for all) позволяла любому вошедшему вставить себе ЛЮБОЙ предмет (платный — без оплаты, награду — без достижения);
-- сбой между шагами оставлял предмет без списания; «хватает ли баллов» проверял только клиент; цены лежали только в клиентском реестре.
--
-- РЕШЕНИЕ.
--  1) customization_catalog — серверный каталог (ключ, категория, источник, цена, ключ достижения). Читать могут все вошедшие, писать — никто с клиента.
--     Каталог ДОЛЖЕН совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
--     Новый предмет = новая строка (небольшая миграция с таким же insert … on conflict do update).
--  2) buy_customization(p_item_key, p_label) — SECURITY DEFINER: цену берёт ИЗ КАТАЛОГА (не от клиента), сама считает баланс монет (как на клиенте:
--     calc_user_points + бонусы achievement_bonuses − потрачено shop_items.cost), под advisory-блокировкой пользователя (две вкладки не купят одновременно),
--     в ОДНОЙ транзакции пишет предмет и списание. Ошибки (собственные коды: P0004 = assert_failure и не ловится EXCEPTION WHEN OTHERS):
--     28000 нужно войти, CU002 неизвестный предмет, CU003 не продаётся, 23505 уже куплено, CU004 не хватает баллов, CU005 профиль не найден.
--     p_label — только подпись строки в истории Магазина (на цену не влияет).
--  3) claim_achievement_items() — выдаёт предметы-награды, чей значок (customization_catalog.achievement_key) есть у пользователя в user_achievements. Идемпотентна.
--     ОГРАНИЧЕНИЕ: user_achievements пока пишет клиент, поэтому «заслужил ли значок» сервер не проверяет — срез 6 аудита. Но выдать предмет БЕЗ значка из каталога нельзя.
--  4) user_customizations: клиенту остаётся только ЧТЕНИЕ своих строк (политика for select, права insert/update/delete отозваны).
-- Клиент вызывает эти функции; пока миграция не применена, он работает прежним путём.
-- Откат: drop function buy_customization(text, text); drop function claim_achievement_items(); drop table customization_catalog;
--   drop policy "read own user_customizations" on user_customizations; create policy "own user_customizations" on user_customizations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
--   grant insert, update, delete on user_customizations to authenticated;
-- Проверка после применения — docs/sql-checks/060_secure_customization_purchase_check.sql, стенд: scripts/sql_harness/scenario_060_buy_customization.sql.

create table if not exists customization_catalog (
  item_key text primary key check (char_length(item_key) between 1 and 80),
  category text not null check (char_length(category) between 1 and 40),
  source text not null check (source in ('points', 'achievement')),
  price int check (price is null or price > 0),
  achievement_key text check (achievement_key is null or char_length(achievement_key) between 1 and 80),
  constraint customization_catalog_source_shape check (
    (source = 'points' and price is not null and achievement_key is null)
    or (source = 'achievement' and price is null and achievement_key is not null)
  )
);

alter table customization_catalog enable row level security;
drop policy if exists "read customization_catalog" on customization_catalog;
create policy "read customization_catalog" on customization_catalog for select to authenticated using (true);
revoke all on customization_catalog from anon, authenticated;
grant select on customization_catalog to authenticated;

-- Содержимое каталога — по реестру ITEMS на момент миграции (цены: низкая 100, средняя 150, высокая 250).
insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_neon', 'avatar_frame', 'points', 100, null),
  ('frame_aurora', 'avatar_frame', 'points', 150, null),
  ('frame_gold', 'avatar_frame', 'achievement', null, 'streak_30'),
  ('frame_flame', 'avatar_frame', 'points', 250, null),
  ('frame_rainbow', 'avatar_frame', 'points', 250, null),
  ('frame_inferno', 'avatar_frame', 'achievement', null, 'streak_100'),
  ('frame_pulse', 'avatar_frame', 'achievement', null, 'mega_productivity'),
  ('frame_royal', 'avatar_frame', 'achievement', null, 'points_1000'),
  ('frame_ink', 'avatar_frame', 'achievement', null, 'words_50'),
  ('frame_neuron', 'avatar_frame', 'achievement', null, 'learned_50'),
  ('frame_target', 'avatar_frame', 'achievement', null, 'goals_25'),
  ('frame_gear', 'avatar_frame', 'achievement', null, 'skills_10'),
  ('frame_bookmark', 'avatar_frame', 'achievement', null, 'books_10'),
  ('frame_steel', 'avatar_frame', 'achievement', null, 'workouts_100'),
  ('frame_cup', 'avatar_frame', 'achievement', null, 'challenges_10'),
  ('frame_beacon', 'avatar_frame', 'achievement', null, 'milestones_10'),
  ('frame_rare_challenges', 'avatar_frame', 'achievement', null, 'challenges_25'),
  ('frame_rare_milestones', 'avatar_frame', 'achievement', null, 'milestones_25'),
  ('collapse_accordion', 'collapse_style', 'points', 150, null),
  ('collapse_summary', 'collapse_style', 'points', 250, null)
on conflict (item_key) do update
  set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

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
  insert into shop_items (user_id, name, cost, redeemed, redeemed_date)
  values (v_user, coalesce(nullif(left(btrim(p_label), 120), ''), p_item_key), v_cat.price, true, user_today(v_user));

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
revoke all on function claim_achievement_items() from public, anon;
grant execute on function buy_customization(text, text) to authenticated;
grant execute on function claim_achievement_items() to authenticated;

-- Клиенту — только чтение своих открытых предметов; запись идёт через функции выше.
drop policy if exists "own user_customizations" on user_customizations;
drop policy if exists "read own user_customizations" on user_customizations;
create policy "read own user_customizations" on user_customizations for select using (auth.uid() = user_id);
revoke insert, update, delete on user_customizations from anon, authenticated;
