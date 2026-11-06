-- 120_goal_repeat.sql
-- BACKLOG 81.4 «Повторяющиеся цели» (оплата счетов раз в месяц). repeat_every — 'week' | 'month' | 'year' (null — не повторяется).
-- Когда повторяющаяся цель выполнена, клиент создаёт следующую (срок — следующий период от срока этой цели; если опоздали больше периода — ближайший будущий),
-- а id созданной кладёт в repeat_next_id у выполненной: так повторная отметка «выполнено» не плодит дубликаты, а отмена выполнения убирает нетронутую следующую.
-- Внешний ключ не ставим: удаление следующей цели не должно упираться в ссылку. Права и RLS не меняются. Без миграции форма не показывает «Повтор».
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (повторный запуск безопасен).
alter table goals add column if not exists repeat_every text;
alter table goals add column if not exists repeat_next_id uuid;
do $$ begin
  alter table goals add constraint goals_repeat_every_check check (repeat_every is null or repeat_every in ('week', 'month', 'year'));
exception when duplicate_object then null; end $$;
