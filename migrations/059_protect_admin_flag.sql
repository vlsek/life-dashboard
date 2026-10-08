-- 059: защита флага profiles.is_admin от самовыдачи прав (BACKLOG 47.6 «Безопасность покупок», аудит агента 1, 2026-10-08).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). СРОЧНО: см. docs/SECURITY_AUDIT_47_6.md, находка №1 (номер 059: 057 и 058 заняты огоньками и заметкой метрики).
--
-- ПРОБЛЕМА. Права администратора определяются полем profiles.is_admin (миграция 009): админ-функции admin_list_users()/admin_delete_user()
-- проверяют именно его и работают как SECURITY DEFINER (видят всю базу, в том числе почты). А политика «own profile» (for all, user_id = auth.uid())
-- позволяет любому вошедшему пользователю обновлять СВОЮ строку целиком — значит, и выставить себе is_admin = true одной командой из консоли
-- браузера, после чего получить список почт всех пользователей и удалять чужие аккаунты.
--
-- РЕШЕНИЕ. Триггер BEFORE INSERT OR UPDATE на profiles: роли приложения (authenticated/anon — под ними ходит клиент через PostgREST) не могут
-- ни создать строку с is_admin = true (флаг при вставке принудительно false), ни изменить его в существующей строке (ошибка 42501).
-- SQL Editor, миграции и service_role работают под другими ролями (postgres/service_role) — выдать админа вручную по-прежнему можно:
--   update profiles set is_admin = true where user_id = '...';
-- Клиентский код is_admin НЕ пишет (апсерты профиля отправляют только свои колонки; проверено по репозиторию), поэтому ничего не ломается.
-- Триггер НЕ SECURITY DEFINER: current_user — это роль вызывающего, а не владельца функции.
-- Откат: drop trigger protect_profile_admin_flag on profiles; drop function protect_profile_admin_flag();
-- Проверка: scripts/sql_harness/scenario_audit_security.sql.

create or replace function protect_profile_admin_flag() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
    elsif new.is_admin is distinct from old.is_admin then
      raise exception 'Менять права администратора из приложения нельзя' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_admin_flag on profiles;
create trigger protect_profile_admin_flag
  before insert or update on profiles
  for each row execute function protect_profile_admin_flag();
