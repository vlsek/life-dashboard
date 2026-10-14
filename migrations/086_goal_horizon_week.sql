-- 086_goal_horizon_week.sql
-- Горизонт цели «На неделю» (BACKLOG 1052, срез 2, агент 1). ТРЕБУЕТ миграцию 084 (колонка goals.horizon).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Расширяет проверку goals_horizon_check: к 'now' | 'soon' | 'month' | 'day' добавляется 'week'.
-- Данные не трогаются. Пока 086 не применена, форма «Цели» предложит «На неделю», но запись упадёт с понятным текстом «примените миграцию 086».
-- Откат: сначала перевести цели с horizon = 'week' в другой горизонт (update goals set horizon = 'soon' where horizon = 'week'),
-- затем вернуть прежнюю проверку без 'week'.

alter table goals drop constraint if exists goals_horizon_check;
alter table goals add constraint goals_horizon_check
  check (horizon is null or horizon in ('now', 'soon', 'week', 'month', 'day'));
