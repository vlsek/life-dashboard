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
