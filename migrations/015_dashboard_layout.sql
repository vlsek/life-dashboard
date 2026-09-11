-- 015_dashboard_layout.sql
--
-- Кастомизируемые блоки главной страницы дашборда: можно скрывать/показывать и менять
-- порядок блоков (Профиль, Streaks, Графики, Дневные метрики+Цели на сегодня).
-- Хранится как jsonb-массив [{"key":"profile","visible":true}, ...] — порядок в массиве
-- задаёт порядок отображения. По той же схеме, что уже есть у dashboard_charts (004).

alter table profiles add column if not exists dashboard_layout jsonb;
