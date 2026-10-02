-- 035_profile_favorite_pages.sql
-- «Избранное» (BACKLOG 6.2, агент 6): список избранных страниц синхронно между устройствами. ПРИМЕНИТЬ В SUPABASE SQL EDITOR (владелец).
-- Формат — jsonb-массив ключей страниц меню, например ["goals","workouts","shop"]. null = ещё не выбирали (клиент тогда отправит
-- локальный список с устройства). Права и RLS не меняются: профиль пользователь читает и правит сам, как и остальные колонки profiles.
-- Без этой миграции «Избранное» работает, но только на этом устройстве (localStorage `favorite_pages`).

alter table profiles add column if not exists favorite_pages jsonb;
