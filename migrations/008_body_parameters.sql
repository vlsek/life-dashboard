-- migrations/008_body_parameters.sql
-- "Параметры тела" (вес/мышцы/жир/вода) становятся настраиваемыми — как обычные метрики,
-- можно добавлять свои и удалять ненужные. Существующие данные из body_stats переносятся
-- автоматически, ничего не теряется.

create table if not exists body_parameters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text default '📏',
  unit text default '',
  position int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists body_parameter_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  parameter_id uuid not null references body_parameters(id) on delete cascade,
  value numeric,
  unique (user_id, date, parameter_id)
);

alter table body_parameters enable row level security;
alter table body_parameter_values enable row level security;
drop policy if exists "own body_parameters" on body_parameters;
drop policy if exists "own body_parameter_values" on body_parameter_values;
create policy "own body_parameters" on body_parameters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own body_parameter_values" on body_parameter_values for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Перенос данных: заводим 4 стандартных параметра каждому существующему пользователю
-- и переносим туда всё, что уже накоплено в body_stats. Старую таблицу body_stats не трогаем
-- и не удаляем (на случай если где-то ещё осталась ссылка) — она просто больше не используется.
do $$
declare
  u record;
  p_weight uuid;
  p_fat uuid;
  p_muscle uuid;
  p_water uuid;
begin
  for u in select distinct user_id from body_stats loop
    -- создаём параметры только если у пользователя их ещё нет (защита от повторного запуска)
    if not exists (select 1 from body_parameters where user_id = u.user_id) then
      insert into body_parameters (user_id, name, icon, unit, position) values (u.user_id, 'Вес', '⚖️', 'кг', 0) returning id into p_weight;
      insert into body_parameters (user_id, name, icon, unit, position) values (u.user_id, '% жира', '🧬', '%', 1) returning id into p_fat;
      insert into body_parameters (user_id, name, icon, unit, position) values (u.user_id, 'Мышечная масса', '💪', 'кг', 2) returning id into p_muscle;
      insert into body_parameters (user_id, name, icon, unit, position) values (u.user_id, '% воды в теле', '💧', '%', 3) returning id into p_water;

      insert into body_parameter_values (user_id, date, parameter_id, value)
        select user_id, date, p_weight, weight from body_stats where user_id = u.user_id and weight is not null
        on conflict do nothing;
      insert into body_parameter_values (user_id, date, parameter_id, value)
        select user_id, date, p_fat, body_fat from body_stats where user_id = u.user_id and body_fat is not null
        on conflict do nothing;
      insert into body_parameter_values (user_id, date, parameter_id, value)
        select user_id, date, p_muscle, muscle_mass from body_stats where user_id = u.user_id and muscle_mass is not null
        on conflict do nothing;
      insert into body_parameter_values (user_id, date, parameter_id, value)
        select user_id, date, p_water, water_pct from body_stats where user_id = u.user_id and water_pct is not null
        on conflict do nothing;
    end if;
  end loop;
end $$;
