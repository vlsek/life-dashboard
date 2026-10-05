-- 050_goal_categories.sql
-- Сохранённый список СВОИХ категорий целей (BACKLOG раздел 35 «Цели: категории должны сохраняться», агент 4; владелец 2026-10-05: миграции можно).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Что хранится: ОДНА строка на одну категорию пользователя:
--   name     — название как его ввёл человек (1–40 символов, без лишних пробелов по краям);
--   position — порядок в списке (0, 1, 2…; при переносе — от самой частой к редкой).
-- Сама цель по-прежнему хранит категорию текстом в goals.category (ничего не переименовывается и не пересчитывается) — таблица только
-- запоминает список, чтобы категория не пропадала из выбора, когда последняя цель с ней удалена или выполнена и убрана.
-- Одинаковые названия без учёта регистра и пробелов по краям не плодятся (уникальный индекс).
--
-- Права: как у остальных личных таблиц — читать/писать/удалять только свои строки (RLS по user_id).
-- Без этой миграции раздел «Цели» работает как раньше (список категорий собирается из самих целей) — ничего не ломается.
-- Откат: drop table goal_categories;

create table if not exists goal_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint goal_categories_name_check check (char_length(btrim(name)) between 1 and 40)
);

create unique index if not exists goal_categories_user_name_idx on goal_categories(user_id, lower(btrim(name)));
create index if not exists goal_categories_user_pos_idx on goal_categories(user_id, position);

alter table goal_categories enable row level security;

drop policy if exists "own goal_categories" on goal_categories;
create policy "own goal_categories" on goal_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Перенос: все категории, которые уже есть у целей, становятся записями списка (без потерь).
-- «Без категории» / «No category» — это отсутствие категории, а не категория, их не переносим.
-- Порядок: самые частые сверху, при равенстве — по алфавиту; из разных написаний берётся самое «раннее» по алфавиту (min).
insert into goal_categories (user_id, name, position)
select s.user_id, s.name, (row_number() over (partition by s.user_id order by s.cnt desc, s.name) - 1)::integer
from (
  select user_id,
         min(btrim(category)) as name,
         count(*) as cnt
  from goals
  where category is not null
    and char_length(btrim(category)) between 1 and 40
    and lower(btrim(category)) not in ('без категории', 'no category')
  group by user_id, lower(btrim(category))
) s
on conflict do nothing;
