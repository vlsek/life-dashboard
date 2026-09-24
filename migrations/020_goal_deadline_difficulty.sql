-- 020_goal_deadline_difficulty.sql
--
-- Дедлайн и сложность у долгосрочных целей (раздел "Цели"):
--   deadline    — "сделать до такого-то числа" (например, поменять масло до 15 октября); необязательно
--   difficulty  — метка сложности: 'easy' | 'medium' | 'hard'; необязательно
-- Оба поля nullable — существующие цели остаются как были. RLS не трогаем: политика на goals
-- уже покрывает всю строку целиком.

alter table goals add column if not exists deadline date;
alter table goals add column if not exists difficulty text;

alter table goals drop constraint if exists goals_difficulty_check;
alter table goals add constraint goals_difficulty_check
  check (difficulty is null or difficulty in ('easy', 'medium', 'hard'));
