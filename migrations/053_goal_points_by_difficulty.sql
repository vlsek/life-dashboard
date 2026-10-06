-- 053_goal_points_by_difficulty.sql
-- Баллы за цель на СЕРВЕРЕ задаёт сложность (BACKLOG раздел 35 «Цели: защитить от слишком больших баллов» + раздел 40 «Баллы за цели — по сложности 5/10/15»;
-- решения владельца 2026-10-06: баллы не вводятся вручную; потолок и в БД — ДА, миграцией; умножения на число этапов НЕТ; старые значения не приводим).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Клиент (v3.38) уже не даёт ввести баллы и сам выставляет 5 / 10 / 15 по сложности. Эта миграция закрывает обход через API/старую вкладку:
-- триггер BEFORE INSERT OR UPDATE на goals приводит баллы к правилу, что бы ни прислал клиент.
--   • СОЗДАНИЕ цели: points := по сложности — лёгкая (easy) 5, средняя (medium) 10, сложная (hard) 15, не задана (NULL) 5.
--   • ПРАВКА цели: баллы меняются ТОЛЬКО если изменилась сложность (тогда — снова по шкале выше); иначе остаются прежними, что бы ни прислали.
--     Поэтому старые цели с «чужими» баллами (например 50) НЕ пересчитываются и не ломаются: отметка выполнения, этапы, название и т. д. их не трогают.
--     Приводить старые значения к 5/10/15 не нужно (решение владельца) — они станут по шкале только если человек сам сменит сложность цели.
--   • Запросы БЕЗ пользователя (SQL Editor, service role, `auth.uid() is null`) — без ограничений: владелец может поправить баллы вручную.
-- Что НЕ меняется: расчёт баланса и очков по-прежнему берёт goals.points выполненных целей; RLS «только свои» не трогаем; колонки и данные не меняем.
-- Откат: drop trigger goals_points_by_difficulty on goals; drop function goals_points_by_difficulty();

create or replace function goals_points_by_difficulty() returns trigger
language plpgsql
as $$
begin
  -- SQL Editor / service role: ограничений нет (у запросов приложения auth.uid() всегда задан)
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' or new.difficulty is distinct from old.difficulty then
    new.points := case new.difficulty when 'easy' then 5 when 'medium' then 10 when 'hard' then 15 else 5 end;
  else
    new.points := old.points; -- сложность не менялась: баллы прежние (старые цели не пересчитываются)
  end if;
  return new;
end
$$;

drop trigger if exists goals_points_by_difficulty on goals;
create trigger goals_points_by_difficulty
  before insert or update on goals
  for each row execute function goals_points_by_difficulty();
