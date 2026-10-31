-- 112_skill_category.sql
-- Категории навыков (BACKLOG 44.4 срез 2, РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-10-29: «категории навыков свободным текстом с выбором из своих, как у целей»; агент 1).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- skills.category — свободный текст (1–40 символов без пробелов по краям) или NULL = «Без категории». Отдельной таблицы категорий нет:
-- список «своих» категорий клиент берёт из уже введённых у человека навыков (подсказка в поле формы).
-- Старые навыки остаются с NULL. RLS не трогаем: политика на skills уже покрывает строку целиком.
-- Без этой миграции страница «Навыки» работает как раньше (плоский список), поле категории в форме не пишется.
-- Откат: alter table skills drop column category;

alter table skills add column if not exists category text;

alter table skills drop constraint if exists skills_category_check;
alter table skills add constraint skills_category_check
  check (category is null or (category = btrim(category) and char_length(category) between 1 and 40));
