-- 087_plan_repeats.sql
-- Повторяющиеся пункты плана (BACKLOG 1054 «Повторяющиеся цели на день», срез 1, агент 1).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Одна строка = один повторяющийся пункт «Планов» на главной:
--   text     — название пункта (1–120 символов, без лишних пробелов по краям);
--   time     — необязательное время «HH:MM» (как у обычного пункта плана);
--   schedule — расписание в том же виде, что metrics.schedule:
--                NULL                               — каждый день,
--                {"type":"days","days":[1,3,5]}     — только по дням недели (0 = воскресенье, как Date.getDay()),
--                {"type":"weekly","min":3}          — N раз в неделю (1–7): предлагается каждый день, пока за неделю (пн–вс) отмечено меньше N.
-- Сам план дня по-прежнему лежит в daily_notes.planned_goals: отметка повторяющегося пункта добавляет туда обычный выполненный
-- пункт с полем repeat = id строки (по нему считается «сколько раз за неделю»). Таблица ничего в старых данных не меняет.
--
-- Права: как у остальных личных таблиц — читать/писать/удалять только свои строки (RLS по user_id).
-- Без этой миграции «Планы» работают как раньше (блок «Повторяющиеся» просто не показывается).
-- Откат: drop table plan_repeats;

create table if not exists plan_repeats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  time text,
  schedule jsonb,
  created_at timestamptz not null default now(),
  constraint plan_repeats_text_check check (char_length(btrim(text)) between 1 and 120),
  constraint plan_repeats_time_check check (time is null or time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint plan_repeats_schedule_check check (
    schedule is null
    or (schedule->>'type' = 'days' and jsonb_typeof(schedule->'days') = 'array')
    or (schedule->>'type' = 'weekly' and (schedule->>'min') ~ '^[1-7]$')
  )
);

create index if not exists plan_repeats_user_idx on plan_repeats(user_id, created_at);

alter table plan_repeats enable row level security;

drop policy if exists "own plan_repeats" on plan_repeats;
create policy "own plan_repeats" on plan_repeats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
