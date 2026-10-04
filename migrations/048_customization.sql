-- 048: «Кастомизация» (BACKLOG 491, агент 2; модель хранения согласована владельцем 2026-10-03).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- user_customizations — какие предметы кастомизации у пользователя ОТКРЫТЫ (одна строка на предмет):
--   item_key    — ключ из реестра web-customization/src/lib/customization.ts (frame_neon, frame_gold …);
--   source      — откуда: 'points' (куплен за баллы), 'achievement' (награда за достижение), 'challenge' (награда за челлендж, позже);
--   unlocked_at — когда открыт.
-- profiles.customization (jsonb) — ВЫБРАННОЕ: {"avatar_frame": "frame_neon"}; пусто = ничего не выбрано.
-- Покупка за баллы дополнительно пишет «выкупленный» товар в shop_items (цена списывается из баланса так же, как покупка в Магазине).
-- Права: только свои строки (RLS по user_id), как у остальных личных таблиц.
-- Без миграции страница /customization/ открывается, но показывает витрину без покупок и подсказку применить миграцию.
-- Откат: drop table user_customizations; alter table profiles drop column customization;

create table if not exists user_customizations (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  source text not null check (source in ('points', 'achievement', 'challenge')),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table user_customizations enable row level security;

drop policy if exists "own user_customizations" on user_customizations;
create policy "own user_customizations" on user_customizations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table profiles add column if not exists customization jsonb not null default '{}'::jsonb;
