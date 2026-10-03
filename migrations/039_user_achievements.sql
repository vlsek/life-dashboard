-- 039_user_achievements.sql
-- «Достижения» (BACKLOG 19:06, агент 6): какие достижения у пользователя уже открыты и когда.
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Что хранится: ОДНА строка на одно открытое достижение.
--   key         — ключ из реестра web-achievements/src/lib/achievements.ts (first_goal, streak_30, points_500 …);
--   unlocked_at — когда открыто; NULL — достижение было выполнено ещё ДО появления раздела (дата неизвестна);
--   служебная строка key = '_baseline' — «раздел уже заглядывал в этот аккаунт»: отличает первый заход (всё выполненное
--   открывается задним числом, без даты) от последующих (новое достижение получает настоящую дату).
-- Сам прогресс (серии, баллы, тренировки …) НЕ хранится: он каждый раз считается из данных пользователя; таблица нужна, чтобы
-- открытое оставалось открытым, даже если счётчик потом упал (цель удалили, книгу вернули в «читаю»), и чтобы помнить дату.
--
-- Права: как у остальных личных таблиц — читать/писать/удалять только свои строки (RLS по user_id).
-- Без этой миграции страница работает: открытые достижения запоминаются на устройстве (localStorage), а после применения
-- миграции подтягиваются в таблицу при следующем заходе — ничего не ломается и не теряется.

create table if not exists user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table user_achievements enable row level security;

drop policy if exists "own user_achievements" on user_achievements;
create policy "own user_achievements" on user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
