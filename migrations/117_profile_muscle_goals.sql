-- 117_profile_muscle_goals.sql
-- BACKLOG 80.5 «Свои цели подходов по группам мышц». Цель — подходов в неделю на группу: «поддержка» 6, «обычная» 10 (по умолчанию), «приоритет» 15.
-- Формат — jsonb-объект: {"back": 15, "calves": 6}; группы без записи — 10. null/{} — всё по умолчанию.
-- Права и RLS не меняются: профиль пользователь читает и правит сам (как workout_program, 040). Без миграции цели работают только на этом устройстве
-- (localStorage `workout_muscle_goals`). ПРИМЕНИТЬ В SUPABASE SQL EDITOR (повторный запуск безопасен).
alter table profiles add column if not exists muscle_goals jsonb;
