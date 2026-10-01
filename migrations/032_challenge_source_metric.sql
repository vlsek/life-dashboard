-- 032_challenge_source_metric.sql
-- Челленджи: источник значений — метрика пользователя (BACKLOG 14, «11:28 — Челленджи: значение из метрик»).
--
-- Пока за день нет ручной записи в challenge_entries, значение дня берётся из daily_values выбранной метрики
-- (число, сумма повторений по подходам для типа 'sets', true → 1 для boolean). Ручная запись за день всегда главнее.
-- Расчёт делает клиент (web-challenges), ничего не копируется в challenge_entries — метрика остаётся единственным
-- источником правды, а правка значения на Дашборде сразу видна в челлендже.
--
-- Только добавляющая миграция. Если метрику удалят, ссылка обнуляется (on delete set null), а челлендж и его
-- ручные записи остаются. Без этой миграции раздел работает как раньше; выбор источника в форме не сохранится.
--
-- Проверка: select id, title, source_metric_id from challenge_instances where source_metric_id is not null limit 5;

alter table challenge_instances add column if not exists source_metric_id uuid references metrics(id) on delete set null;
