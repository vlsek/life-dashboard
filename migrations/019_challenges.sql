-- 019_challenges.sql
--
-- Раздел "Челленджи": можно начать готовый челлендж из каталога (каталог зашит в JS,
-- challenges.js — как и типовые программы тренировок, ничего специфичного для БД) или
-- завести свой. Три типа челленджей покрывают всё, что просили:
--   daily_fixed       — "100 отжиманий каждый день, месяц" (фиксированная дневная цель,
--                        N дней подряд)
--   daily_progressive — "отжимания каждый день +5 раз" (дневная цель растёт на шаг
--                        каждый день, от стартового значения)
--   daily_boolean     — "без сахара 21 день" (просто отметка "сделал/не сделал" за день)
--   cumulative_count  — "прочитать 100 книг" (нет привязки к дням, копится общий счётчик,
--                        каждая запись — отдельный пункт со своей заметкой, например
--                        название книги)

create table if not exists challenge_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text,              -- ключ шаблона из каталога в challenges.js, или null для своего челленджа
  title text not null,
  icon text default '🏆',
  type text not null,            -- daily_fixed | daily_progressive | daily_boolean | cumulative_count
  unit text,                     -- единица (раз, книг, слов и т.п.)
  start_date date not null default current_date,
  duration_days int,             -- для daily_* типов — на сколько дней челлендж
  daily_target numeric,          -- для daily_fixed
  start_value numeric,           -- для daily_progressive — цель на 1-й день
  daily_increment numeric,       -- для daily_progressive — на сколько растёт цель каждый день
  target_count numeric,          -- для cumulative_count — общая цель
  item_label text,               -- для cumulative_count — как называть один пункт (например "книга")
  active boolean default true,   -- false — брошен/скрыт, но данные не удалены
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists challenge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references challenge_instances(id) on delete cascade,
  date date not null default current_date,  -- для daily_* — конкретный день; для cumulative_count — дата добавления пункта
  value numeric,                             -- фактическое значение за день (daily_*), или 1 за штуку (cumulative_count)
  note text,                                 -- для cumulative_count — например название книги
  created_at timestamptz default now()
);

create index if not exists challenge_entries_challenge_idx on challenge_entries(challenge_id);
-- Не делаем уникальный индекс "один вход в день" на уровне БД — он должен действовать
-- только для daily_* типов (daily_boolean/daily_fixed/daily_progressive), а не для
-- cumulative_count (там за один день может быть несколько пунктов — например две книги
-- дочитаны в один день). Тип челленджа хранится в challenge_instances, а не в самой
-- записи, так что чище держать правило "один вход в день" на уровне приложения
-- (challenges.js делает upsert через select-затем-update-или-insert, а не через
-- onConflict) — это и обходит ограничение, и не плодит частичный индекс, завязанный
-- на другую таблицу.

alter table challenge_instances enable row level security;
alter table challenge_entries enable row level security;

drop policy if exists "own challenge_instances" on challenge_instances;
create policy "own challenge_instances" on challenge_instances for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own challenge_entries" on challenge_entries;
create policy "own challenge_entries" on challenge_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
