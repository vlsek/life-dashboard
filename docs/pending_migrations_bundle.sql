-- ============================================================================
-- СВОДНЫЙ ФАЙЛ ОЖИДАЮЩИХ МИГРАЦИЙ (собран скриптом scripts/build_pending_migrations.py, руками не править)
-- Состав (42 файлов): 20 миграций из раздела «Ждёт владельца» COORDINATION.md (пункты «применить миграцию …») + 22 «страховочных» миграций
-- каталога цен (*catalog*: только insert … on conflict do update — безопасны всегда; агенты не всегда вписывают их в «Ждёт владельца»,
-- а предмет без строки каталога купить нельзя: «неизвестный предмет»).
-- КАК ПРИМЕНЯТЬ: Supabase → SQL Editor → вставить ВЕСЬ этот файл → Run. Порядок — по номерам (так и требуют пункты «ПОСЛЕ NNN»).
-- Каждая миграция помечена агентом как «повтор безопасен», поэтому уже применённые проходят без вреда; при ошибке на каком-то месте
-- пришлите её текст и номер файла — после исправления файл можно запускать снова целиком.
-- ВНИМАНИЕ: миграции без пометки «ПОСЛЕ» всё равно идут строго по номерам; эти файлы дополняют уже применённые 001–056.
-- Список файлов:
--   057_streak_sparks   [ждёт владельца]
--   058_metric_note   [ждёт владельца]
--   059_protect_admin_flag   [ждёт владельца]
--   060_secure_customization_purchase   [ждёт владельца]
--   061_catalog_coin_frames   [ждёт владельца]
--   062_secure_achievement_bonuses   [ждёт владельца]
--   065_protect_purchase_journal   [ждёт владельца]
--   066_debug_mode   [ждёт владельца]
--   067_catalog_week_gauge   [страховка: каталог цен]
--   068_catalog_day_gauge   [страховка: каталог цен]
--   069_last_seen   [ждёт владельца]
--   071_catalog_day_gauge_2   [страховка: каталог цен]
--   072_catalog_water_anim   [страховка: каталог цен]
--   073_catalog_water_glass   [страховка: каталог цен]
--   076_catalog_week_gauge_more   [ждёт владельца]
--   078_catalog_water_anim_more   [ждёт владельца]
--   080_catalog_collapse_more   [страховка: каталог цен]
--   081_catalog_day_gauge_more   [страховка: каталог цен]
--   082_catalog_water_glass_more   [страховка: каталог цен]
--   083_catalog_week_wave   [страховка: каталог цен]
--   085_goal_weight   [ждёт владельца]
--   088_catalog_collapse_dot_double   [страховка: каталог цен]
--   089_catalog_water_anim_bounce_pulse   [ждёт владельца]
--   090_catalog_week_teeth   [страховка: каталог цен]
--   091_catalog_day_thin_sunset   [страховка: каталог цен]
--   092_catalog_week_valley_slope   [ждёт владельца]
--   093_catalog_water_glass_beaker_pitcher   [страховка: каталог цен]
--   094_catalog_collapse_square_burger   [страховка: каталог цен]
--   095_catalog_water_anim_tilt_flash   [страховка: каталог цен]
--   096_catalog_day_ocean_aurora   [страховка: каталог цен]
--   097_catalog_week_peak_saw   [страховка: каталог цен]
--   098_catalog_collapse_arrow_ring   [страховка: каталог цен]
--   099_catalog_water_glass_carafe_teacup   [страховка: каталог цен]
--   100_catalog_water_anim_shake_drop   [страховка: каталог цен]
--   101_catalog_day_mint_ember   [страховка: каталог цен]
--   102_catalog_week_towers_weekend   [страховка: каталог цен]
--   103_catalog_frames_ornament   [ждёт владельца]
--   104_catalog_frames_tyre_helm   [ждёт владельца]
--   105_catalog_water_glass_highball_barrel   [ждёт владельца]
--   106_catalog_frames_ferris_baroque   [ждёт владельца]
--   107_catalog_collapse_star_diamond   [ждёт владельца]
--   108_catalog_water_anim_spin_rise   [ждёт владельца]
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/057_streak_sparks.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/058_metric_note.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 058_metric_note.sql
-- Метрики дня: необязательная ЗАМЕТКА к отметке («что учил/изучил», «что читал»…). BACKLOG 867 «Учёба»: по умолчанию просто отмечать, что
-- учился, и дописывать, что именно (ОТВЕТ ВЛАДЕЛЬЦА 2026-10-07: речь о метрике «Учёба» в дневных метриках, не о «Навыках» и не о «Языках»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Что добавляет:
--   daily_values.note  — текст заметки к значению метрики за день (NULL — заметки нет);
--   metrics.ask_note   — «спрашивать заметку» у этой метрики: на Дашборде у отмеченной метрики-галочки появляется поле «Что учил(а)?».
-- Только добавляющая миграция: права и RLS действуют прежние (политики владельца на всю строку), новых политик не нужно. Серверные функции баллов,
-- серий и рейтинга читают daily_values.value и про заметку ничего не знают — менять их не нужно, баллы и серии не затрагиваются.
-- Без миграции всё работает как раньше: форма метрики не пишет ask_note, а поле заметки на Дашборде скрыто.

alter table daily_values add column if not exists note text;
alter table metrics add column if not exists ask_note boolean not null default false;

-- Разумный предел длины заметки (защита от случайной вставки гигантского текста).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'daily_values_note_len') then
    alter table daily_values add constraint daily_values_note_len check (note is null or char_length(note) <= 500);
  end if;
end $$;

comment on column daily_values.note is 'Необязательная заметка к значению метрики за день, до 500 символов (миграция 058). NULL — заметки нет.';
comment on column metrics.ask_note is 'Спрашивать заметку к отметке этой метрики (миграция 058). Только для метрик-галочек.';

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/059_protect_admin_flag.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 059: защита флага profiles.is_admin от самовыдачи прав (BACKLOG 47.6 «Безопасность покупок», аудит агента 1, 2026-10-08).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). СРОЧНО: см. docs/SECURITY_AUDIT_47_6.md, находка №1 (номер 059: 057 и 058 заняты огоньками и заметкой метрики).
--
-- ПРОБЛЕМА. Права администратора определяются полем profiles.is_admin (миграция 009): админ-функции admin_list_users()/admin_delete_user()
-- проверяют именно его и работают как SECURITY DEFINER (видят всю базу, в том числе почты). А политика «own profile» (for all, user_id = auth.uid())
-- позволяет любому вошедшему пользователю обновлять СВОЮ строку целиком — значит, и выставить себе is_admin = true одной командой из консоли
-- браузера, после чего получить список почт всех пользователей и удалять чужие аккаунты.
--
-- РЕШЕНИЕ. Триггер BEFORE INSERT OR UPDATE на profiles: роли приложения (authenticated/anon — под ними ходит клиент через PostgREST) не могут
-- ни создать строку с is_admin = true (флаг при вставке принудительно false), ни изменить его в существующей строке (ошибка 42501).
-- SQL Editor, миграции и service_role работают под другими ролями (postgres/service_role) — выдать админа вручную по-прежнему можно:
--   update profiles set is_admin = true where user_id = '...';
-- Клиентский код is_admin НЕ пишет (апсерты профиля отправляют только свои колонки; проверено по репозиторию), поэтому ничего не ломается.
-- Триггер НЕ SECURITY DEFINER: current_user — это роль вызывающего, а не владельца функции.
-- Откат: drop trigger protect_profile_admin_flag on profiles; drop function protect_profile_admin_flag();
-- Проверка: scripts/sql_harness/scenario_audit_security.sql.

create or replace function protect_profile_admin_flag() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    elsif new.is_admin is distinct from old.is_admin then
      raise exception 'Менять права администратора из приложения нельзя' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_admin_flag on profiles;
create trigger protect_profile_admin_flag
  before insert or update on profiles
  for each row execute function protect_profile_admin_flag();

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/060_secure_customization_purchase.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/061_catalog_coin_frames.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 061: каталог цен — 8 новых рамок аватарки за монеты (BACKLOG 46.2, срез (а), агент 2). Продолжение миграции 060 (серверная покупка).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка новых рамок отвечает «неизвестный предмет».
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('frame_mint','frame_sky','frame_graphite','frame_coral','frame_sunset','frame_breath','frame_comet','frame_glitch');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_mint', 'avatar_frame', 'points', 100, null),
  ('frame_sky', 'avatar_frame', 'points', 100, null),
  ('frame_graphite', 'avatar_frame', 'points', 100, null),
  ('frame_coral', 'avatar_frame', 'points', 150, null),
  ('frame_sunset', 'avatar_frame', 'points', 150, null),
  ('frame_breath', 'avatar_frame', 'points', 150, null),
  ('frame_comet', 'avatar_frame', 'points', 250, null),
  ('frame_glitch', 'avatar_frame', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/062_secure_achievement_bonuses.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 062: серверная выдача бонусных монет за достижения (BACKLOG 47.6, срез 3; аудит агента 1, docs/SECURITY_AUDIT_47_6.md, находка №2).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). Не зависит от 059/060, но логично после них.
--
-- ПРОБЛЕМА. Миграция 051 разрешала клиенту вставлять в achievement_bonuses ЛЮБУЮ свою строку (ключ и сумму до 500 присылал сам клиент). Первичный ключ
-- (user_id, key) лишь не даёт выдать один ключ дважды, но ключей можно придумать сколько угодно → неограниченные монеты (подтверждено сценарием аудита).
--
-- РЕШЕНИЕ.
--  1) achievement_bonus_catalog(key, coins) — серверный перечень значков с монетной наградой и её размер. Читать могут все вошедшие, писать — никто.
--     Содержимое — по реестру web-achievements/src/lib/rewards.ts на момент миграции (ступени 1 и 2 восьми лесенок: 20 и 50 монет).
--     Совпадение с реестром проверяет web-achievements/src/bonusCatalogSync.test.ts (при расхождении печатает готовые SQL-строки для новой миграции).
--  2) claim_achievement_bonuses() — SECURITY DEFINER: выдаёт монеты ТОЛЬКО за значки из каталога, которые есть у пользователя в user_achievements, в размере из каталога.
--     Идемпотентна (on conflict do nothing: повтор, две вкладки, «задним числом» — безопасны). Возвращает только что выданное (key, coins).
--     ОГРАНИЧЕНИЕ: user_achievements пока пишет клиент, поэтому «заслужен ли значок» сервер не проверяет (срез 6 аудита). Но придумать ключ или сумму больше нельзя:
--     максимум — каталог целиком (16 значков, 20×8 + 50×8 = 560 монет за всю жизнь аккаунта).
--  3) achievement_bonuses: клиенту остаётся ТОЛЬКО чтение своих строк (политика вставки удалена, право insert отозвано).
-- Клиент (web-achievements coinBonuses.ts) вызывает функцию; пока миграция не применена, он работает прежним путём (прямая вставка).
-- Откат: drop function claim_achievement_bonuses(); drop table achievement_bonus_catalog;
--   create policy "grant own achievement_bonuses" on achievement_bonuses for insert with check (auth.uid() = user_id); grant insert on achievement_bonuses to authenticated;
-- Проверка после применения — docs/sql-checks/062_secure_achievement_bonuses_check.sql, стенд: scripts/sql_harness/scenario_062_achievement_bonuses.sql.

create table if not exists achievement_bonus_catalog (
  key text primary key check (char_length(key) between 1 and 80),
  coins numeric(10, 1) not null check (coins >= 0.1 and coins <= 500)
);

alter table achievement_bonus_catalog enable row level security;
drop policy if exists "read achievement_bonus_catalog" on achievement_bonus_catalog;
create policy "read achievement_bonus_catalog" on achievement_bonus_catalog for select to authenticated using (true);
revoke all on achievement_bonus_catalog from anon, authenticated;
grant select on achievement_bonus_catalog to authenticated;

insert into achievement_bonus_catalog (key, coins) values
  ('words_10', 20),
  ('words_25', 50),
  ('learned_10', 20),
  ('learned_25', 50),
  ('first_goal', 20),
  ('goals_10', 50),
  ('first_skill', 20),
  ('skills_5', 50),
  ('first_book', 20),
  ('books_5', 50),
  ('workouts_10', 20),
  ('workouts_50', 50),
  ('challenges_1', 20),
  ('challenges_5', 50),
  ('milestones_1', 20),
  ('milestones_5', 50)
on conflict (key) do update set coins = excluded.coins;

create or replace function claim_achievement_bonuses()
returns table (key text, coins numeric)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Нужно войти в аккаунт' using errcode = '28000';
  end if;
  -- одна выдача за раз на пользователя (две вкладки не мешают друг другу; результат второй — пустой)
  perform pg_advisory_xact_lock(hashtext('bonus:' || v_user::text));
  return query
  insert into achievement_bonuses (user_id, key, coins)
  select v_user, c.key, c.coins
  from achievement_bonus_catalog c
  where exists (select 1 from user_achievements a where a.user_id = v_user and a.key = c.key)
  on conflict (user_id, key) do nothing
  returning achievement_bonuses.key, achievement_bonuses.coins;
end $$;

revoke all on function claim_achievement_bonuses() from public, anon;
grant execute on function claim_achievement_bonuses() to authenticated;

-- Клиенту — только чтение своих строк; выдаёт функция выше.
drop policy if exists "grant own achievement_bonuses" on achievement_bonuses;
revoke insert, update, delete on achievement_bonuses from anon, authenticated;
grant select on achievement_bonuses to authenticated;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/065_protect_purchase_journal.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/066_debug_mode.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 066: режим отладки администратора — «мерить» предметы Кастомизации без оплаты (BACKLOG 47.4 + 47.6 срез 5, аудит docs/SECURITY_AUDIT_47_6.md).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повтор безопасен). Применять после 059.
--
-- ЧТО ДЕЛАЕТ. Добавляет флаг profiles.debug_mode. Включить его можно ТОЛЬКО себе и ТОЛЬКО администратору — функцией set_debug_mode(on),
-- которая проверяет profiles.is_admin НА СЕРВЕРЕ. Сам флаг ничего не выдаёт: «примерка» — чисто клиентская (предмет временно показывается,
-- но НЕ пишется в user_customizations / profiles.customization, не списывает монеты и не выдаёт достижений), поэтому у других пользователей
-- платные предметы не появляются. Флаг лишь говорит интерфейсу, что кнопку «Примерить» показывать.
-- ОХРАНА. Роли приложения (authenticated, anon) не могут менять debug_mode напрямую (ошибка 42501): ни включить, ни выключить — только функцией.
-- Нельзя создать профиль сразу с debug_mode = true (при вставке принудительно false). Если у пользователя нет is_admin (или его сняли в SQL Editor),
-- debug_mode принудительно false для ЛЮБОЙ роли — отозванный админ не остаётся в режиме отладки. Охрана is_admin из 059 сохранена.
-- SQL Editor и SECURITY DEFINER-функции работают не под ролями приложения — вручную флаг по-прежнему можно поправить.
-- Откат: drop function set_debug_mode(boolean); alter table profiles drop column debug_mode;
--        (триггер protect_profile_admin_flag вернуть из 059.)
-- Проверка: scripts/sql_harness/scenario_066_debug_mode.sql, docs/sql-checks/066_debug_mode_check.sql.

alter table profiles add column if not exists debug_mode boolean not null default false;

create or replace function protect_profile_admin_flag() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.debug_mode := false;
    else
      if new.is_admin is distinct from old.is_admin then
        raise exception 'Менять права администратора из приложения нельзя' using errcode = '42501';
      end if;
      if new.debug_mode is distinct from old.debug_mode then
        raise exception 'Режим отладки включается только через set_debug_mode' using errcode = '42501';
      end if;
    end if;
  end if;
  -- не администратор (в том числе отозванный вручную) в режиме отладки быть не может — для любой роли
  if not coalesce(new.is_admin, false) then
    new.debug_mode := false;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_admin_flag on profiles;
create trigger protect_profile_admin_flag
  before insert or update on profiles
  for each row execute function protect_profile_admin_flag();

create or replace function set_debug_mode(p_on boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Нужно войти в аккаунт' using errcode = '28000';
  end if;
  if not exists (select 1 from profiles p where p.user_id = v_user and coalesce(p.is_admin, false)) then
    raise exception 'Режим отладки — только для администратора' using errcode = '42501';
  end if;
  update profiles set debug_mode = coalesce(p_on, false) where user_id = v_user;
  return coalesce(p_on, false);
end $$;

revoke all on function set_debug_mode(boolean) from public, anon;
grant execute on function set_debug_mode(boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/067_catalog_week_gauge.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 067: каталог цен — виды спидометра недели (BACKLOG 53.2 срез 1, агент 1; список и цены — на усмотрение агента по разрешению владельца 2026-10-10).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Семиугольник по дням — у всех бесплатно (это «ничего не выбрано»), в каталог не входит.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('week_classic','week_bars');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_classic', 'week_gauge', 'points', 100, null),
  ('week_bars', 'week_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/068_catalog_day_gauge.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 068: каталог цен — виды спидометра ДНЯ (BACKLOG 53.2 срез 2, агент 1; список и цены — на усмотрение агента по разрешению владельца 2026-10-11).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Обычное кольцо дня — у всех бесплатно (это «ничего не выбрано»), в каталог не входит.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_dashed','day_glow');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_dashed', 'day_gauge', 'points', 100, null),
  ('day_glow', 'day_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/069_last_seen.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/071_catalog_day_gauge_2.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 071: каталог цен — ещё два вида спидометра ДНЯ (BACKLOG 53.2 срез 3 / 56.1, агент 1).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 и 068 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_ticks','day_gradient');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_ticks', 'day_gauge', 'points', 150, null),
  ('day_gradient', 'day_gauge', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/072_catalog_water_anim.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 072: каталог цен — анимации питья воды (BACKLOG 54.9 / 56.1, агент 3; список и цены — на усмотрение агента по разрешению владельца 2026-10-11).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Бесплатные анимации (волна, капли, рябь, пузырьки, струя, всплеск) в каталог не входят: это обычная настройка устройства.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_rain','water_tide','water_sparkle');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_rain', 'water_anim', 'points', 100, null),
  ('water_tide', 'water_anim', 'points', 150, null),
  ('water_sparkle', 'water_anim', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/073_catalog_water_glass.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 073: каталог цен — вид САМОГО стакана воды (BACKLOG 57.2б, уточнение владельца 13:14; агент 1).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 060 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('glass_mug','glass_bottle','glass_flask','glass_goblet');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('glass_mug', 'water_glass', 'points', 100, null),
  ('glass_bottle', 'water_glass', 'points', 150, null),
  ('glass_flask', 'water_glass', 'points', 150, null),
  ('glass_goblet', 'water_glass', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/076_catalog_week_gauge_more.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 076: каталог цен — ещё два вида спидометра недели «Семь точек» и «Ступеньки» (BACKLOG 59.3, агент 3; по просьбе владельца 2026-10-12 — «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 067 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('week_dots','week_steps');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_dots', 'week_gauge', 'points', 100, null),
  ('week_steps', 'week_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/078_catalog_water_anim_more.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 078: каталог цен — ещё две платные анимации воды «Качка» и «Сияние» (BACKLOG 59.4, агент 3; по просьбе владельца 2026-10-12 — «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_sway','water_glow');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_sway', 'water_anim', 'points', 150, null),
  ('water_glow', 'water_anim', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/080_catalog_collapse_more.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 080: каталог цен — ещё два платных вида сворачивания блоков «Плюс/минус» и «Треугольник» (BACKLOG 59.4, агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('collapse_plus','collapse_caret');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('collapse_plus', 'collapse_style', 'points', 100, null),
  ('collapse_caret', 'collapse_style', 'points', 100, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/081_catalog_day_gauge_more.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 081: каталог цен — ещё два платных вида кольца дня «Толстое кольцо» и «Радужное кольцо» (BACKLOG 59.4, агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_thick','day_rainbow');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_thick', 'day_gauge', 'points', 100, null),
  ('day_rainbow', 'day_gauge', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/082_catalog_water_glass_more.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 082: каталог цен — ещё две платные формы стакана воды «Тамблер» и «Банка» (BACKLOG 59.4, агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('glass_tumbler','glass_jar');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('glass_tumbler', 'water_glass', 'points', 100, null),
  ('glass_jar', 'water_glass', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/083_catalog_week_wave.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 083: каталог цен — ещё один платный вид спидометра недели «Волна» (BACKLOG 59.4, агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key = 'week_wave';

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_wave', 'week_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/085_goal_weight.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 085_goal_weight.sql
-- Цели на вес (BACKLOG 1085, агент 7): режим «Сбросить вес» / «Набрать вес» у цели, стартовый и целевой вес.
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- goals.weight_mode   — 'lose' | 'gain' или NULL (обычная цель).
-- goals.weight_start  — вес на старте цели, кг.
-- goals.weight_target — целевой вес, кг. Для 'lose' меньше старта, для 'gain' больше.
-- Текущий вес в колонку НЕ дублируется: источник истины — последнее измерение в body_stats.weight (новая запись за сегодня при
-- правке веса в цели; правка веса на странице тела видна в цели сразу — она читает то же последнее измерение).
-- Без этой миграции «Цели» работают как раньше: выбор «Сбросить/Набрать вес» в форме появляется только при наличии колонок.
-- RLS не трогаем: политика на goals уже покрывает строку целиком.
-- Откат: alter table goals drop column weight_mode, drop column weight_start, drop column weight_target;

alter table goals add column if not exists weight_mode text;
alter table goals add column if not exists weight_start numeric;
alter table goals add column if not exists weight_target numeric;

alter table goals drop constraint if exists goals_weight_check;
alter table goals add constraint goals_weight_check check (
  (weight_mode is null and weight_start is null and weight_target is null)
  or (
    weight_mode is not null and weight_mode in ('lose', 'gain')
    and weight_start is not null and weight_target is not null -- CHECK пропускает NULL (результат NULL ≠ false), поэтому «не пусто» требуем явно
    and weight_start between 20 and 500
    and weight_target between 20 and 500
    and ((weight_mode = 'lose' and weight_target < weight_start) or (weight_mode = 'gain' and weight_target > weight_start))
  )
);

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/088_catalog_collapse_dot_double.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 088: каталог цен — ещё два платных вида сворачивания блоков «Точка» и «Двойная стрелка» (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 080 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('collapse_dot','collapse_double');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('collapse_dot', 'collapse_style', 'points', 100, null),
  ('collapse_double', 'collapse_style', 'points', 100, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/089_catalog_water_anim_bounce_pulse.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 089: каталог цен — ещё две платные анимации воды «Прыжок» и «Пульс» (BACKLOG 59.4; правило владельца «если задач нет — новые предметы в разделы, где их меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 078 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_bounce','water_pulse');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_bounce', 'water_anim', 'points', 100, null),
  ('water_pulse', 'water_anim', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/090_catalog_week_teeth.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 090: каталог цен — ещё один платный вид спидометра недели «Зубцы» (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 083 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key = 'week_teeth';

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_teeth', 'week_gauge', 'points', 100, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/091_catalog_day_thin_sunset.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 091: каталог цен — ещё два платных вида кольца дня «Нить» (тонкое) и «Закат» (градиент) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 081 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_thin','day_sunset');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_thin', 'day_gauge', 'points', 100, null),
  ('day_sunset', 'day_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/092_catalog_week_valley_slope.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 092: каталог цен — ещё два платных вида спидометра недели «Долина» и «Спуск» (BACKLOG 59.4; правило владельца «если задач нет — новые предметы в разделы, где их меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 091 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('week_valley','week_slope');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_valley', 'week_gauge', 'points', 150, null),
  ('week_slope', 'week_gauge', 'points', 100, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/093_catalog_water_glass_beaker_pitcher.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 093: каталог цен — ещё две платные формы стакана воды «Мензурка» (150) и «Кувшин» (250) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('glass_beaker','glass_pitcher');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('glass_beaker', 'water_glass', 'points', 150, null),
  ('glass_pitcher', 'water_glass', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/094_catalog_collapse_square_burger.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 094: каталог цен — ещё два платных вида маркера сворачивания блоков «Квадрат» (100) и «Гамбургер» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('collapse_square','collapse_burger');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('collapse_square', 'collapse_style', 'points', 100, null),
  ('collapse_burger', 'collapse_style', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/095_catalog_water_anim_tilt_flash.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 095: каталог цен — ещё две платные анимации воды «Наклон» (100) и «Вспышка» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_tilt','water_flash');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_tilt', 'water_anim', 'points', 100, null),
  ('water_flash', 'water_anim', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/096_catalog_day_ocean_aurora.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 096: каталог цен — ещё два платных вида кольца дня «Океан» (150) и «Аврора» (250) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_ocean','day_aurora');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_ocean', 'day_gauge', 'points', 150, null),
  ('day_aurora', 'day_gauge', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/097_catalog_week_peak_saw.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 097: каталог цен — ещё два платных вида шкалы недели «Пик» (100) и «Пила» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('week_peak','week_saw');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_peak', 'week_gauge', 'points', 100, null),
  ('week_saw', 'week_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/098_catalog_collapse_arrow_ring.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 098: каталог цен — ещё два платных вида маркера сворачивания блоков «Длинная стрелка» (100) и «Кольцо» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('collapse_arrow','collapse_ring');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('collapse_arrow', 'collapse_style', 'points', 100, null),
  ('collapse_ring', 'collapse_style', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/099_catalog_water_glass_carafe_teacup.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 099: каталог цен — ещё две платные формы стакана воды «Графин» (150) и «Чашка» (100) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('glass_carafe','glass_teacup');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('glass_carafe', 'water_glass', 'points', 150, null),
  ('glass_teacup', 'water_glass', 'points', 100, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/100_catalog_water_anim_shake_drop.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 100: каталог цен — ещё две платные анимации воды «Дрожь» (100) и «Падение» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_shake','water_drop');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_shake', 'water_anim', 'points', 100, null),
  ('water_drop', 'water_anim', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/101_catalog_day_mint_ember.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 101: каталог цен — ещё два платных вида кольца дня «Мята» (100) и «Жар» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('day_mint','day_ember');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('day_mint', 'day_gauge', 'points', 100, null),
  ('day_ember', 'day_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/102_catalog_week_towers_weekend.sql   [страховка: каталог цен]
-- ----------------------------------------------------------------------------
-- 102: каталог цен — ещё два платных вида шкалы недели «Башни» (100) и «Выходные» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('week_towers','week_weekend');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('week_towers', 'week_gauge', 'points', 100, null),
  ('week_weekend', 'week_gauge', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/103_catalog_frames_ornament.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 103: каталог цен — три платные рамки-орнамента «не кругом» (BACKLOG 44.18з, срез 1): «Лавровый венок», «Лианы», «Вензель».
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 102 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('frame_wreath','frame_vines','frame_flourish');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_wreath', 'avatar_frame', 'points', 250, null),
  ('frame_vines', 'avatar_frame', 'points', 150, null),
  ('frame_flourish', 'avatar_frame', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/104_catalog_frames_tyre_helm.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 104: каталог цен — ещё две платные рамки-орнамента «Шина» и «Штурвал» (BACKLOG 44.18з, срез 2).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 103 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('frame_tyre','frame_helm');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_tyre', 'avatar_frame', 'points', 150, null),
  ('frame_helm', 'avatar_frame', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/105_catalog_water_glass_highball_barrel.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 105: каталог цен — ещё две платные формы стакана воды «Хайбол» (100) и «Бочонок» (150) (агент 7; правило «если задач нет — предметы кастомизации там, где их меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('glass_highball','glass_barrel');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('glass_highball', 'water_glass', 'points', 100, null),
  ('glass_barrel', 'water_glass', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/106_catalog_frames_ferris_baroque.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 106: каталог цен — ещё две платные рамки-орнамента «Колесо обозрения» и «Барокко» (BACKLOG 44.18з, срез 3).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 105 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Цену и источник предмета знает СЕРВЕР (customization_catalog); пока этих строк нет, покупка отвечает «неизвестный предмет», а остальное работает как раньше.
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('frame_ferris','frame_baroque');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('frame_ferris', 'avatar_frame', 'points', 150, null),
  ('frame_baroque', 'avatar_frame', 'points', 250, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/107_catalog_collapse_star_diamond.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 107: каталог цен — ещё два платных вида маркера сворачивания блоков «Ромб» (100) и «Звезда» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('collapse_diamond','collapse_star');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('collapse_diamond', 'collapse_style', 'points', 100, null),
  ('collapse_star', 'collapse_style', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/108_catalog_water_anim_spin_rise.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 108: каталог цен — ещё две платные анимации воды «Оборот» (100) и «Всплытие» (150) (агент 3; «предметы кастомизации, которых меньше всего»).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR ПОСЛЕ 072 (одним запуском; повторный запуск безопасен: on conflict do update).
-- Список должен совпадать с клиентским реестром web-customization/src/lib/customization.ts (проверяет тест catalogSync.test.ts).
-- Откат: delete from customization_catalog where item_key in ('water_spin','water_rise');

insert into customization_catalog (item_key, category, source, price, achievement_key) values
  ('water_spin', 'water_anim', 'points', 100, null),
  ('water_rise', 'water_anim', 'points', 150, null)
on conflict (item_key) do update set category = excluded.category, source = excluded.source, price = excluded.price, achievement_key = excluded.achievement_key;
