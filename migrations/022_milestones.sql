-- 022_milestones.sql
--
-- Раздел "Вехи" (milestones.html): регулярные дела с датой и периодом — например, замена масла
-- в машине каждые 6 месяцев или 10 000 км, замена фильтров, визит к врачу. Пишешь, когда сделал
-- в последний раз и как часто повторять; раздел считает, когда пора в следующий раз.
--   due_date        — срок следующего раза (считается из last_date + интервал, либо задан вручную)
--   interval_value/interval_unit — период повторения: 'day' | 'week' | 'month' | 'year' (null = разовая веха)
--   last_km / interval_km — необязательный пробег (последний раз и через сколько км повторять)
--   history         — журнал выполнений [{date, km, note}]
--   done            — для разовых вех (без интервала): выполнена
-- Своя таблица, RLS как у остальных (каждый видит только свои строки).

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text default '',
  last_date date,
  interval_value int,
  interval_unit text,
  due_date date,
  last_km numeric,
  interval_km numeric,
  note text,
  history jsonb default '[]'::jsonb,
  done boolean default false,
  created_at timestamptz default now(),
  constraint milestones_interval_unit_check check (interval_unit is null or interval_unit in ('day', 'week', 'month', 'year'))
);

create index if not exists milestones_user_due_idx on milestones(user_id, due_date);

alter table milestones enable row level security;

drop policy if exists "own milestones" on milestones;
create policy "own milestones" on milestones for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
