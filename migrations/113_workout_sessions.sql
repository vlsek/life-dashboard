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
