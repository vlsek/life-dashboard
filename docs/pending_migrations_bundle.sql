-- ============================================================================
-- СВОДНЫЙ ФАЙЛ ОЖИДАЮЩИХ МИГРАЦИЙ (собран скриптом scripts/build_pending_migrations.py, руками не править)
-- Владелец подтвердил применение по 110 включительно — всё, что новее, ниже.
-- Состав (2 файлов): 2 миграций из раздела «Ждёт владельца» COORDINATION.md (пункты «применить миграцию …») + 0 «страховочных» миграций
-- каталога цен (*catalog*: только insert … on conflict do update — безопасны всегда; агенты не всегда вписывают их в «Ждёт владельца»,
-- а предмет без строки каталога купить нельзя: «неизвестный предмет»).
-- КАК ПРИМЕНЯТЬ: Supabase → SQL Editor → вставить ВЕСЬ этот файл → Run. Порядок — по номерам (так и требуют пункты «ПОСЛЕ NNN»).
-- Каждая миграция помечена агентом как «повтор безопасен», поэтому уже применённые проходят без вреда; при ошибке на каком-то месте
-- пришлите её текст и номер файла — после исправления файл можно запускать снова целиком.
-- ВНИМАНИЕ: миграции без пометки «ПОСЛЕ» всё равно идут строго по номерам; эти файлы дополняют уже применённые 001–056.
-- Список файлов:
--   111_goal_reward   [ждёт владельца]
--   113_workout_sessions   [ждёт владельца]
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

-- ----------------------------------------------------------------------------
-- ФАЙЛ: migrations/113_workout_sessions.sql   [ждёт владельца]
-- ----------------------------------------------------------------------------
-- 113_workout_sessions.sql
-- «Тренировки» v2 (BACKLOG 69.1, контракт — docs/WORKOUTS_V2_CONTRACT.md): тренировка как СЕССИЯ (старт, конец, название), рутины (шаблоны),
-- порядок и суперсеты у записей, настройки раздела.
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- ТОЛЬКО ДОБАВЛЯЕТ: ни одна существующая строка, колонка, политика или функция не меняется и не удаляется. Без этой миграции раздел
-- «Тренировки» работает как раньше (клиент проверяет наличие таблицы `workout_sessions` и молча остаётся на записях «упражнение × день»).
-- Старые записи `workout_entries` без `session_id` остаются валидными: клиент показывает их как «неявную тренировку» за день
-- (группировка по `date`), данные не переносятся.
--
-- Идентификаторы создаёт КЛИЕНТ (uuid) — так записи из офлайн-очереди (раздел 66) уходят повторно без дублей (upsert по `id`).
-- Формат подхода (`workout_entries.sets`, jsonb) расширяется только необязательными полями — база его НЕ проверяет, как и раньше:
--   type  — 'normal' | 'warmup' | 'drop' | 'failure' (нет поля = normal)
--   rpe   — число 5..10 с шагом 0.5 (необязательно)
--   done  — true, когда подход выполнен в активной тренировке (у старых записей поля нет — считаются выполненными)
--   rest  — секунды отдыха после подхода (необязательно)
-- Правила чтения (разминка не входит в объём и рекорды; неизвестный type = normal) — в web-workouts/src/lib/sessionContract.ts.

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Общая функция «обновить updated_at» (нужна нескольким таблицам; create or replace — безопасно при повторе)
-- ---------------------------------------------------------------------------------------------------------------------------------
create or replace function workout_touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Рутины: шаблон тренировки (название, папка, порядок) и его упражнения
-- ---------------------------------------------------------------------------------------------------------------------------------
create table if not exists workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  folder text check (folder is null or char_length(btrim(folder)) between 1 and 60),
  notes text check (notes is null or char_length(notes) <= 1000),
  position integer not null default 0 check (position >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_routines_user_idx on workout_routines(user_id, archived, position);

create table if not exists workout_routine_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references workout_routines(id) on delete cascade,
  exercise_id uuid not null references workout_exercises(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  target_sets smallint check (target_sets is null or target_sets between 1 and 20),
  reps_min smallint check (reps_min is null or reps_min between 1 and 999),
  reps_max smallint check (reps_max is null or (reps_max between 1 and 999 and (reps_min is null or reps_max >= reps_min))),
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  superset_group smallint check (superset_group is null or superset_group between 1 and 20),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists workout_routine_items_routine_idx on workout_routine_items(routine_id, position);
create index if not exists workout_routine_items_exercise_idx on workout_routine_items(exercise_id);

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Сессия — одна тренировка. finished_at IS NULL = идёт сейчас; не больше ОДНОЙ идущей на пользователя (второе устройство, получив
-- ошибку 23505 при старте, берёт уже идущую сессию). `date` — локальная дата начала у пользователя (считает клиент, как workout_entries.date),
-- чтобы группировка по дням не зависела от часового пояса сервера. source: 'live' — начата кнопкой «Начать»; 'manual' — добавлена
-- задним числом (всегда завершена).
-- ---------------------------------------------------------------------------------------------------------------------------------
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text check (name is null or char_length(btrim(name)) between 1 and 80),
  date date not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  routine_id uuid references workout_routines(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 2000),
  source text not null default 'live' check (source in ('live', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (finished_at is null or finished_at >= started_at),
  check (source <> 'manual' or finished_at is not null)
);
create index if not exists workout_sessions_user_date_idx on workout_sessions(user_id, date desc, started_at desc);
create unique index if not exists workout_sessions_one_active_idx on workout_sessions(user_id) where finished_at is null;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Записи упражнений привязываются к сессии. Удалили сессию — записи НЕ пропадают (on delete set null) и снова показываются как
-- «неявная тренировка» дня: удаление данных всегда явное, делает клиент после подтверждения.
-- position — порядок упражнения внутри сессии; superset_group — номер группы суперсета внутри сессии (одинаковый номер = один суперсет).
-- ---------------------------------------------------------------------------------------------------------------------------------
alter table workout_entries add column if not exists session_id uuid references workout_sessions(id) on delete set null;
alter table workout_entries add column if not exists position integer check (position is null or position >= 0);
alter table workout_entries add column if not exists superset_group smallint check (superset_group is null or superset_group between 1 and 20);
create index if not exists workout_entries_session_idx on workout_entries(session_id) where session_id is not null;

-- Настройки раздела (по пользователю; клиент читает и пишет целиком): единицы, таймер отдыха, RPE и т.п. — ключи в контракте.
alter table profiles add column if not exists workout_settings jsonb;

-- ---------------------------------------------------------------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------------------------------------------------------------
drop trigger if exists workout_routines_touch on workout_routines;
create trigger workout_routines_touch before update on workout_routines for each row execute function workout_touch_updated_at();
drop trigger if exists workout_sessions_touch on workout_sessions;
create trigger workout_sessions_touch before update on workout_sessions for each row execute function workout_touch_updated_at();

-- ---------------------------------------------------------------------------------------------------------------------------------
-- Права: только свои строки. Пункты рутины и сессии дополнительно проверяют, что ссылаются на СВОИ рутину/упражнение
-- (внешний ключ сам владельца не проверяет).
-- ---------------------------------------------------------------------------------------------------------------------------------
alter table workout_routines enable row level security;
alter table workout_routine_items enable row level security;
alter table workout_sessions enable row level security;

drop policy if exists "own workout_routines" on workout_routines;
create policy "own workout_routines" on workout_routines for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own workout_routine_items" on workout_routine_items;
create policy "own workout_routine_items" on workout_routine_items for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from workout_routines r where r.id = routine_id and r.user_id = auth.uid())
    and exists (select 1 from workout_exercises e where e.id = exercise_id and e.user_id = auth.uid())
  );

drop policy if exists "own workout_sessions" on workout_sessions;
create policy "own workout_sessions" on workout_sessions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (routine_id is null or exists (select 1 from workout_routines r where r.id = routine_id and r.user_id = auth.uid()))
  );

comment on table workout_sessions is
  'Тренировка как сессия (миграция 113, BACKLOG 69.1): старт/конец, название, рутина. finished_at NULL — идёт сейчас, не больше одной на пользователя.';
comment on table workout_routines is 'Рутина — шаблон тренировки (миграция 113, BACKLOG 69.1).';
comment on table workout_routine_items is 'Упражнение в рутине: целевые подходы/повторы, таймер отдыха, группа суперсета (миграция 113).';
comment on column workout_entries.session_id is
  'Сессия, к которой относится запись (миграция 113). NULL — запись старого формата: показывается как «неявная тренировка» за день.';
comment on column workout_entries.position is 'Порядок упражнения внутри сессии (миграция 113).';
comment on column workout_entries.superset_group is 'Номер группы суперсета внутри сессии; одинаковый номер = один суперсет (миграция 113).';
comment on column profiles.workout_settings is
  'Настройки раздела «Тренировки» целиком (jsonb, миграция 113): units, rest_default, auto_rest, rpe, prev_source, keep_awake, smart_superset.';
