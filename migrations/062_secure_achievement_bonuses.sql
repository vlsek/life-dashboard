-- 062: серверная выдача бонусных монет за достижения (BACKLOG 47.6, срез 3; аудит агента 1, docs/SECURITY_AUDIT_47_6.md, находка №2).
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). Не зависит от 059/060, но логично после них.
--
-- ПРОБЛЕМА. Миграция 051 разрешала клиенту вставлять в achievement_bonuses ЛЮБУЮ свою строку (ключ и сумму до 500 присылал сам клиент). Первичный ключ
-- (user_id, key) лишь не даёт выдать один ключ дважды, но ключей можно придумать сколько угодно → неограниченные монеты (подтверждено сценарием аудита).
--
-- РЕШЕНИЕ.
--  1) achievement_bonus_catalog(key, coins) — серверный перечень значков с монетной наградой и её размер. Читать могут все вошедшие, писать — никто.
--     Содержимое — по реестру web-achievements/src/lib/rewards.ts на момент миграции (ступени 1 и 2 восьми лесенок: 20 и 50 монет).
--     Совпадение с реестром проверяет web-achievements/src/bonusCatalogSync.test.ts (при расхождении печатает готовые SQL-строки для новой миграции).
--  2) claim_achievement_bonuses() — SECURITY DEFINER: выдаёт монеты ТОЛЬКО за значки из каталога, которые есть у пользователя в user_achievements, в размере из каталога.
--     Идемпотентна (on conflict do nothing: повтор, две вкладки, «задним числом» — безопасны). Возвращает только что выданное (key, coins).
--     ОГРАНИЧЕНИЕ: user_achievements пока пишет клиент, поэтому «заслужен ли значок» сервер не проверяет (срез 6 аудита). Но придумать ключ или сумму больше нельзя:
--     максимум — каталог целиком (16 значков, 20×8 + 50×8 = 560 монет за всю жизнь аккаунта).
--  3) achievement_bonuses: клиенту остаётся ТОЛЬКО чтение своих строк (политика вставки удалена, право insert отозвано).
-- Клиент (web-achievements coinBonuses.ts) вызывает функцию; пока миграция не применена, он работает прежним путём (прямая вставка).
-- Откат: drop function claim_achievement_bonuses(); drop table achievement_bonus_catalog;
--   create policy "grant own achievement_bonuses" on achievement_bonuses for insert with check (auth.uid() = user_id); grant insert on achievement_bonuses to authenticated;
-- Проверка после применения — docs/sql-checks/062_secure_achievement_bonuses_check.sql, стенд: scripts/sql_harness/scenario_062_achievement_bonuses.sql.

create table if not exists achievement_bonus_catalog (
  key text primary key check (char_length(key) between 1 and 80),
  coins numeric(10, 1) not null check (coins >= 0.1 and coins <= 500)
);

alter table achievement_bonus_catalog enable row level security;
drop policy if exists "read achievement_bonus_catalog" on achievement_bonus_catalog;
create policy "read achievement_bonus_catalog" on achievement_bonus_catalog for select to authenticated using (true);
revoke all on achievement_bonus_catalog from anon, authenticated;
grant select on achievement_bonus_catalog to authenticated;

insert into achievement_bonus_catalog (key, coins) values
  ('words_10', 20),
  ('words_25', 50),
  ('learned_10', 20),
  ('learned_25', 50),
  ('first_goal', 20),
  ('goals_10', 50),
  ('first_skill', 20),
  ('skills_5', 50),
  ('first_book', 20),
  ('books_5', 50),
  ('workouts_10', 20),
  ('workouts_50', 50),
  ('challenges_1', 20),
  ('challenges_5', 50),
  ('milestones_1', 20),
  ('milestones_5', 50)
on conflict (key) do update set coins = excluded.coins;

create or replace function claim_achievement_bonuses()
returns table (key text, coins numeric)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Нужно войти в аккаунт' using errcode = '28000';
  end if;
  -- одна выдача за раз на пользователя (две вкладки не мешают друг другу; результат второй — пустой)
  perform pg_advisory_xact_lock(hashtext('bonus:' || v_user::text));
  return query
  insert into achievement_bonuses (user_id, key, coins)
  select v_user, c.key, c.coins
  from achievement_bonus_catalog c
  where exists (select 1 from user_achievements a where a.user_id = v_user and a.key = c.key)
  on conflict (user_id, key) do nothing
  returning achievement_bonuses.key, achievement_bonuses.coins;
end $$;

revoke all on function claim_achievement_bonuses() from public, anon;
grant execute on function claim_achievement_bonuses() to authenticated;

-- Клиенту — только чтение своих строк; выдаёт функция выше.
drop policy if exists "grant own achievement_bonuses" on achievement_bonuses;
revoke insert, update, delete on achievement_bonuses from anon, authenticated;
grant select on achievement_bonuses to authenticated;
