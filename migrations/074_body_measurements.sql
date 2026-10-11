-- 074: замеры частей тела (BACKLOG 57.1, агент 1) — «Тренировки» → «Карта мышц» → «Замеры».
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (повторный запуск безопасен). Пока таблицы нет, блок «Замеры» тихо скрыт, остальное работает как раньше.
-- Одна запись = одна часть тела за один день (повторный ввод в тот же день заменяет значение). Значение — обхват в сантиметрах.
-- Откат: drop table if exists body_measurements;

create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  part text not null check (part in ('neck','shoulders','chest','waist','hips','biceps_l','biceps_r','forearm_l','forearm_r','thigh_l','thigh_r','calf_l','calf_r')),
  value_cm numeric(5,1) not null check (value_cm >= 1 and value_cm <= 300),
  created_at timestamptz default now(),
  unique (user_id, date, part)
);

create index if not exists body_measurements_user_part_idx on body_measurements(user_id, part, date);

alter table body_measurements enable row level security;

drop policy if exists "own body_measurements" on body_measurements;
create policy "own body_measurements" on body_measurements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
