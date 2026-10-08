-- 057: «огоньки стриков» — валюта Магазина (BACKLOG 46.3 / «Новая валюта огоньки стриков», агент 6).
-- Решение владельца: вещи-желания Магазина покупаются за ОГОНЬКИ, а Кастомизация — за монеты или достижения. Огоньки копятся отдельно от монет, не сгорают.
-- Нужны: metrics (031 — флаг `count_streak`, 044 — `planned_sets_ok`), daily_values, shop_items, функция `user_today`. Повторный запуск безопасен.
--
-- ПРАВИЛА (расходящиеся ответы владельца сведены так; всё спорное — в `sparks_config`, меняется одной строкой без правки кода):
--  * +1 огонёк за КАЖДУЮ метрику (включено «считать серию», метрика активна) в каждый день, когда она выполнена; огоньки разных метрик суммируются.
--    «Выполнено» — то же правило, что в расчёте серий (`calc_perfect_streak`, 044): да/нет = да, список непуст, числа/подходы — цель достигнута
--    (у «не больше» — больше нуля, но меньше цели; у подходов с планом — ещё и `planned_sets_ok`).
--  * Начисление СРАЗУ, как только отметка внесена (клиент зовёт `sync_streak_sparks()` после изменения данных); окно — сегодня и вчера (поздняя отметка за вчера
--    тоже считается, переписывание истории за недели — нет). Откат: если отметку сняли в том же окне — огонёк снимается, НО только если баланс от этого не уйдёт
--    в минус (потраченное не отнимается).
--  * Потолок `daily_cap` (по умолчанию 10) огоньков в сутки — защита от «накрутки» десятком пустых метрик.
--  * СТАРТ С НУЛЯ: считаются дни не раньше `start_date` (день применения миграции). Задним числом за старые серии огоньки не даются.
--    Захотите задним числом — сдвиньте `start_date` назад и вызовите `backfill_streak_sparks(from)` (у каждого пользователя, самому себе).
--  * Журнал `streak_sparks` — одна строка на (пользователь, день, метрика): повтор безопасен, удаление метрики историю не стирает (FK на метрики нет).
--  * Цена вещи в огоньках — `shop_items.cost_sparks`; у такой вещи `cost` принудительно 0, поэтому расчёт МОНЕТ на всех страницах не меняется.
--    Покупка (`redeemed = true`) защищена триггером: нельзя потратить больше, чем накоплено, даже прямым запросом.
--  * Старые вещи Магазина с ценой в монетах, ещё не купленные, АРХИВИРУЮТСЯ (`archived = true`), не удаляются: владелец решил «сначала архивировать, потом удалить,
--    когда переход полностью сделан». Купленные остаются историей как есть.
-- Откат: drop function sync_streak_sparks(), get_sparks_balance(), backfill_streak_sparks(date), streak_metric_done(metrics, daily_values), sparks_balance_of(uuid);
--        drop trigger shop_items_sparks_guard on shop_items; drop function shop_items_sparks_guard(); drop table streak_sparks, sparks_config;
--        alter table shop_items drop column cost_sparks, drop column archived;

-- ===== настройки экономики =====
create table if not exists sparks_config (
  key text primary key,
  num int,
  day date
);
insert into sparks_config (key, num) values ('daily_cap', 10) on conflict (key) do nothing;       -- максимум огоньков в сутки
insert into sparks_config (key, num) values ('rub_per_spark', 10) on conflict (key) do nothing;   -- подсказка для калькулятора цены в форме вещи (₽ за огонёк)
insert into sparks_config (key, day) values ('start_date', current_date) on conflict (key) do nothing; -- старт с нуля: дни раньше не считаются
alter table sparks_config enable row level security;
drop policy if exists "sparks_config readable" on sparks_config;
create policy "sparks_config readable" on sparks_config for select to authenticated using (true);

-- ===== журнал начислений =====
create table if not exists streak_sparks (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  metric_id uuid not null,   -- без FK: удаление метрики не стирает заработанное
  amount int not null default 1 check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, day, metric_id)
);
create index if not exists streak_sparks_user_day_idx on streak_sparks (user_id, day);
alter table streak_sparks enable row level security;
drop policy if exists "own streak_sparks read" on streak_sparks;
create policy "own streak_sparks read" on streak_sparks for select using (auth.uid() = user_id);
-- писать журнал может только функция начисления (security definer); прямых insert/update/delete для клиента нет

-- ===== вещи Магазина: цена в огоньках + архив =====
alter table shop_items add column if not exists cost_sparks int;
alter table shop_items add column if not exists archived boolean not null default false;
alter table shop_items drop constraint if exists shop_items_cost_sparks_positive;
alter table shop_items add constraint shop_items_cost_sparks_positive check (cost_sparks is null or cost_sparks > 0);

-- Архивируем невыкупленные вещи с ценой в монетах (один раз при применении; купленные — история — не трогаем)
update shop_items set archived = true where coalesce(redeemed, false) = false and cost_sparks is null and archived = false;

-- ===== правило «метрика выполнена в этот день» (то же, что в calc_perfect_streak, 044) =====
create or replace function streak_metric_done(m metrics, dv daily_values)
returns boolean as $$
  select case
    when m.type = 'boolean' then (dv.value = 'true'::jsonb)
    when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)
    when m.type in ('number', 'sets') and m.goal_direction = 'at_most'
      then (metric_numeric_value(m.type, dv.value) > 0
            and metric_numeric_value(m.type, dv.value) < coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)))
    when m.type in ('number', 'sets')
      then (metric_numeric_value(m.type, dv.value) >= coalesce(m.goal_value, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon))
            and planned_sets_ok(m.type, m.planned_sets_log, dv.value, dv.date))
    else false
  end;
$$ language sql stable;

-- ===== баланс: заработано − потрачено =====
create or replace function sparks_balance_of(p_user uuid)
returns bigint as $$
  select coalesce((select sum(amount) from streak_sparks where user_id = p_user), 0)
       - coalesce((select sum(cost_sparks) from shop_items where user_id = p_user and cost_sparks is not null and coalesce(redeemed, false)), 0);
$$ language sql stable security definer;

create or replace function get_sparks_balance()
returns table (earned bigint, spent bigint, balance bigint) as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  return query
  select coalesce((select sum(s.amount) from streak_sparks s where s.user_id = auth.uid()), 0)::bigint,
         coalesce((select sum(i.cost_sparks) from shop_items i where i.user_id = auth.uid() and i.cost_sparks is not null and coalesce(i.redeemed, false)), 0)::bigint,
         sparks_balance_of(auth.uid());
end;
$$ language plpgsql stable security definer;

-- ===== начисление с откатом (вызывает клиент после изменения данных) =====
create or replace function sync_streak_sparks()
returns table (added int, removed int, earned bigint, spent bigint, balance bigint) as $$
declare
  v_user uuid := auth.uid();
  v_today date;
  v_start date;
  v_cap int;
  v_from date;
  r record;
  v_n int;
  v_added int := 0;
  v_removed int := 0;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('sparks:' || v_user::text));
  v_today := user_today(v_user);
  select c.day into v_start from sparks_config c where c.key = 'start_date';
  select c.num into v_cap from sparks_config c where c.key = 'daily_cap';
  v_start := coalesce(v_start, v_today);
  v_cap := coalesce(v_cap, 10);
  v_from := greatest(v_start, v_today - 1);

  -- 1) начисление: метрики, выполненные сегодня/вчера и ещё не записанные в журнал
  for r in
    select dv.date as d, m.id as mid
    from metrics m
    join daily_values dv on dv.metric_id = m.id and dv.user_id = m.user_id
    where m.user_id = v_user and m.active = true and m.count_streak = true
      and dv.date between v_from and v_today
      and streak_metric_done(m, dv)
      and not exists (select 1 from streak_sparks s where s.user_id = v_user and s.day = dv.date and s.metric_id = m.id)
    order by dv.date, m.id
  loop
    select count(*) into v_n from streak_sparks s where s.user_id = v_user and s.day = r.d;
    if v_n < v_cap then
      insert into streak_sparks (user_id, day, metric_id) values (v_user, r.d, r.mid) on conflict do nothing;
      v_added := v_added + 1;
    end if;
  end loop;

  -- 2) откат: отметку сняли (метрика всё ещё активна, а выполнения за этот день уже нет) — снимаем огонёк, если баланс не уйдёт в минус.
  --    Удалённую/выключенную метрику не трогаем: заработанное остаётся.
  for r in
    select s.day as d, s.metric_id as mid, s.amount as amt
    from streak_sparks s
    where s.user_id = v_user and s.day between v_from and v_today
      and exists (select 1 from metrics m where m.id = s.metric_id and m.user_id = v_user and m.active = true and m.count_streak = true)
      and not exists (
        select 1 from metrics m join daily_values dv on dv.metric_id = m.id and dv.user_id = m.user_id
        where m.id = s.metric_id and m.user_id = v_user and dv.date = s.day and streak_metric_done(m, dv)
      )
  loop
    if sparks_balance_of(v_user) >= r.amt then
      delete from streak_sparks s where s.user_id = v_user and s.day = r.d and s.metric_id = r.mid;
      v_removed := v_removed + 1;
    end if;
  end loop;

  return query
  select v_added, v_removed,
         coalesce((select sum(s.amount) from streak_sparks s where s.user_id = v_user), 0)::bigint,
         coalesce((select sum(i.cost_sparks) from shop_items i where i.user_id = v_user and i.cost_sparks is not null and coalesce(i.redeemed, false)), 0)::bigint,
         sparks_balance_of(v_user);
end;
$$ language plpgsql security definer;

-- ===== «задним числом» (по желанию владельца; клиент её сам НЕ зовёт) =====
-- Начисляет себе за дни [max(p_from, start_date), вчера-1] по тем же правилам и с тем же потолком; повтор безопасен.
create or replace function backfill_streak_sparks(p_from date)
returns int as $$
declare
  v_user uuid := auth.uid();
  v_start date;
  v_cap int;
  v_to date;
  r record;
  v_n int;
  v_added int := 0;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('sparks:' || v_user::text));
  select c.day into v_start from sparks_config c where c.key = 'start_date';
  select c.num into v_cap from sparks_config c where c.key = 'daily_cap';
  v_cap := coalesce(v_cap, 10);
  v_to := user_today(v_user) - 2;   -- сегодня и вчера — зона обычной синхронизации
  for r in
    select dv.date as d, m.id as mid
    from metrics m
    join daily_values dv on dv.metric_id = m.id and dv.user_id = m.user_id
    where m.user_id = v_user and m.active = true and m.count_streak = true
      and dv.date between greatest(coalesce(p_from, v_start), coalesce(v_start, p_from)) and v_to
      and streak_metric_done(m, dv)
      and not exists (select 1 from streak_sparks s where s.user_id = v_user and s.day = dv.date and s.metric_id = m.id)
    order by dv.date, m.id
  loop
    select count(*) into v_n from streak_sparks s where s.user_id = v_user and s.day = r.d;
    if v_n < v_cap then
      insert into streak_sparks (user_id, day, metric_id) values (v_user, r.d, r.mid) on conflict do nothing;
      v_added := v_added + 1;
    end if;
  end loop;
  return v_added;
end;
$$ language plpgsql security definer;

-- ===== защита трат: нельзя купить за огоньки больше, чем накоплено; у вещи за огоньки cost = 0 (монеты не затронуты) =====
create or replace function shop_items_sparks_guard()
returns trigger as $$
declare
  v_balance bigint;
begin
  if new.cost_sparks is not null then
    new.cost := 0;
    if coalesce(new.redeemed, false) and (tg_op = 'INSERT' or not coalesce(old.redeemed, false) or old.cost_sparks is distinct from new.cost_sparks) then
      if coalesce(new.archived, false) then
        raise exception 'archived_item' using errcode = 'P0001';
      end if;
      perform pg_advisory_xact_lock(hashtext('sparks:' || new.user_id::text));
      v_balance := coalesce((select sum(amount) from streak_sparks where user_id = new.user_id), 0)
                 - coalesce((select sum(i.cost_sparks) from shop_items i
                             where i.user_id = new.user_id and i.cost_sparks is not null and coalesce(i.redeemed, false) and i.id is distinct from new.id), 0);
      if v_balance < new.cost_sparks then
        raise exception 'insufficient_sparks' using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists shop_items_sparks_guard on shop_items;
create trigger shop_items_sparks_guard before insert or update on shop_items
  for each row execute function shop_items_sparks_guard();

grant execute on function get_sparks_balance() to authenticated;
grant execute on function sync_streak_sparks() to authenticated;
grant execute on function backfill_streak_sparks(date) to authenticated;
