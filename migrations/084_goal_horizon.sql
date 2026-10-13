-- 084_goal_horizon.sql
-- Горизонт цели (BACKLOG 1048+1050 «Горизонты целей», срез 1, агент 1): «Сейчас / В ближайшее время / В ближайший месяц / В конкретный день».
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- goals.horizon — 'now' | 'soon' | 'month' | 'day' или NULL. Дата «конкретного дня» — прежний goals.deadline (миграция 020).
-- У существующих целей horizon остаётся NULL: клиент выводит его из срока (есть deadline — «В конкретный день», нет — «Сейчас»).
-- Без этой миграции «Цели» работают как раньше: пункты «В ближайшее время»/«В ближайший месяц» в форме показываются только при наличии колонки.
-- RLS не трогаем: политика на goals уже покрывает строку целиком.
-- Откат: alter table goals drop column horizon;

alter table goals add column if not exists horizon text;

alter table goals drop constraint if exists goals_horizon_check;
alter table goals add constraint goals_horizon_check
  check (horizon is null or horizon in ('now', 'soon', 'month', 'day'));
