-- 064_profile_ui_settings.sql
-- Настройки и оформление между устройствами (BACKLOG 48.3, срез 1; владелец 2026-10-08: «настройки профиля меж устройствами тянулись: оформление…»).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- profiles.ui_settings (jsonb) — настройки, которые раньше жили только в localStorage устройства: {"site_theme": "mint", "site_lang": "ru", …}.
-- Значение — строка так, как оно лежит в localStorage; null/нет ключа = «не задано». Список ключей ведёт клиент (web-header/src/lib/uiSettingsSync.ts),
-- сервер его не проверяет. Читает и пишет сам пользователь через существующие политики RLS профиля (как favorite_pages / track_water) —
-- отдельных политик не нужно. Без миграции клиент молча работает как раньше (настройки только на устройстве).
-- Откат: alter table profiles drop column if exists ui_settings;

alter table profiles add column if not exists ui_settings jsonb not null default '{}'::jsonb;

comment on column profiles.ui_settings is 'Настройки оформления/поведения, синхронизируемые между устройствами (тема, язык, анимации…). BACKLOG 48.3, миграция 064.';
