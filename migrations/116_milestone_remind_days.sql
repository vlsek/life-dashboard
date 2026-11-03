-- 116_milestone_remind_days.sql
--
-- BACKLOG 76.6 «Вехи: напоминания за N дней». У вехи можно задать, за сколько дней до срока напоминать на Дашборде.
-- Пусто (null) — как раньше: за 7 дней. 0 — только в день срока и после. Аддитивно: клиент без колонки работает как раньше.
alter table milestones add column if not exists remind_days int;

do $$ begin
  alter table milestones add constraint milestones_remind_days_check check (remind_days is null or (remind_days between 0 and 365));
exception when duplicate_object then null; end $$;
