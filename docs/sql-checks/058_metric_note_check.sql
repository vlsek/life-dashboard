-- Проверка миграции 058 (только чтение).
-- 1) колонки есть (ожидается 2 строки: daily_values.note text, metrics.ask_note boolean)
select table_name, column_name, data_type, column_default from information_schema.columns
where table_schema = 'public' and ((table_name = 'daily_values' and column_name = 'note') or (table_name = 'metrics' and column_name = 'ask_note'))
order by table_name;
-- 2) ограничение длины заметки есть (ожидается 1 строка)
select conname from pg_constraint where conname = 'daily_values_note_len';
-- 3) справочно: сколько метрик спрашивают заметку (сразу после миграции — 0, потом растёт по мере включения в форме метрики)
select count(*) as metrics_with_note from metrics where ask_note;
-- 4) справочно: заметки длиннее предела быть не может (ожидается 0)
select count(*) as too_long from daily_values where char_length(note) > 500;
