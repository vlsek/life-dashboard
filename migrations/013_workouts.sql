-- 013_workouts.sql
--
-- Отдельный раздел "Тренировки" (workouts.html) — журнал упражнений с подходами/
-- повторениями/весами, по образцу раздела Навыков (skills), но со своей структурой:
-- сначала заводишь упражнение (справочник), потом логируешь по нему записи по дням
-- (несколько подходов на каждую запись — reps+weight в jsonb-массиве).
--
-- Не трогает старую метрику "Тренировка" (да/нет) в daily-метриках — она остаётся,
-- можно оставить как есть (для streak "идеальный день") или удалить самому через
-- ⚙️ Настроить метрики на дашборде, если этот раздел её полностью заменит.

create table if not exists workout_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,               -- свободный текст: "Грудь", "Ноги", "Спина" и т.п., необязательно
  unit text default 'кг',      -- единица веса, чтобы не хардкодить (кг/lb)
  created_at timestamptz default now()
);

create table if not exists workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references workout_exercises(id) on delete cascade,
  date date not null,
  sets jsonb default '[]'::jsonb,  -- [{"reps": 10, "weight": 60}, {"reps": 8, "weight": 65}, ...]
  notes text,
  created_at timestamptz default now()
);

create index if not exists workout_entries_user_date_idx on workout_entries(user_id, date);
create index if not exists workout_entries_exercise_idx on workout_entries(exercise_id);

alter table workout_exercises enable row level security;
alter table workout_entries enable row level security;

drop policy if exists "own workout_exercises" on workout_exercises;
create policy "own workout_exercises" on workout_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own workout_entries" on workout_entries;
create policy "own workout_entries" on workout_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
