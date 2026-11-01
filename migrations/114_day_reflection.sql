-- 114: «Заметка и оценка дня» (BACKLOG 75.3, срез 1; агент 1).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Самочувствие дня 1–5 (`daily_notes.mood`) и короткая заметка. Заметка кладётся в уже существующую, но не использовавшуюся колонку
-- `daily_notes.notes` — отдельной таблицы нет (в плане была `day_notes`; своя таблица дублировала бы daily_notes и её RLS «own daily_notes»).
-- Без миграции Дашборд работает как раньше: клиент проверяет колонку и блок «Как прошёл день» не показывает.
-- Длина заметки ограничена в базе (≤ 500 символов), как в форме; проверка NOT VALID — старые строки (если у кого-то там что-то лежит) не трогаем,
-- а все новые записи проверяются.
--
-- Откат: alter table daily_notes drop constraint if exists daily_notes_mood_range, drop constraint if exists daily_notes_notes_len, drop column if exists mood;
-- Проверка: scripts/sql_harness/run.sh 114 scenario_114_day_reflection.sql

alter table daily_notes add column if not exists mood smallint;

do $$ begin
  alter table daily_notes add constraint daily_notes_mood_range check (mood is null or mood between 1 and 5);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table daily_notes add constraint daily_notes_notes_len check (notes is null or char_length(notes) <= 500) not valid;
exception when duplicate_object then null; end $$;
