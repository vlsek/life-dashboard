-- 085_goal_weight.sql
-- Цели на вес (BACKLOG 1085, агент 7): режим «Сбросить вес» / «Набрать вес» у цели, стартовый и целевой вес.
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- goals.weight_mode   — 'lose' | 'gain' или NULL (обычная цель).
-- goals.weight_start  — вес на старте цели, кг.
-- goals.weight_target — целевой вес, кг. Для 'lose' меньше старта, для 'gain' больше.
-- Текущий вес в колонку НЕ дублируется: источник истины — последнее измерение в body_stats.weight (новая запись за сегодня при
-- правке веса в цели; правка веса на странице тела видна в цели сразу — она читает то же последнее измерение).
-- Без этой миграции «Цели» работают как раньше: выбор «Сбросить/Набрать вес» в форме появляется только при наличии колонок.
-- RLS не трогаем: политика на goals уже покрывает строку целиком.
-- Откат: alter table goals drop column weight_mode, drop column weight_start, drop column weight_target;

alter table goals add column if not exists weight_mode text;
alter table goals add column if not exists weight_start numeric;
alter table goals add column if not exists weight_target numeric;

alter table goals drop constraint if exists goals_weight_check;
alter table goals add constraint goals_weight_check check (
  (weight_mode is null and weight_start is null and weight_target is null)
  or (
    weight_mode is not null and weight_mode in ('lose', 'gain')
    and weight_start is not null and weight_target is not null -- CHECK пропускает NULL (результат NULL ≠ false), поэтому «не пусто» требуем явно
    and weight_start between 20 and 500
    and weight_target between 20 and 500
    and ((weight_mode = 'lose' and weight_target < weight_start) or (weight_mode = 'gain' and weight_target > weight_start))
  )
);
