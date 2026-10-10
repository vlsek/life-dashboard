-- 066: режим отладки администратора — «мерить» предметы Кастомизации без оплаты (BACKLOG 47.4 + 47.6 срез 5, аудит docs/SECURITY_AUDIT_47_6.md).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повтор безопасен). Применять после 059.
--
-- ЧТО ДЕЛАЕТ. Добавляет флаг profiles.debug_mode. Включить его можно ТОЛЬКО себе и ТОЛЬКО администратору — функцией set_debug_mode(on),
-- которая проверяет profiles.is_admin НА СЕРВЕРЕ. Сам флаг ничего не выдаёт: «примерка» — чисто клиентская (предмет временно показывается,
-- но НЕ пишется в user_customizations / profiles.customization, не списывает монеты и не выдаёт достижений), поэтому у других пользователей
-- платные предметы не появляются. Флаг лишь говорит интерфейсу, что кнопку «Примерить» показывать.
-- ОХРАНА. Роли приложения (authenticated, anon) не могут менять debug_mode напрямую (ошибка 42501): ни включить, ни выключить — только функцией.
-- Нельзя создать профиль сразу с debug_mode = true (при вставке принудительно false). Если у пользователя нет is_admin (или его сняли в SQL Editor),
-- debug_mode принудительно false для ЛЮБОЙ роли — отозванный админ не остаётся в режиме отладки. Охрана is_admin из 059 сохранена.
-- SQL Editor и SECURITY DEFINER-функции работают не под ролями приложения — вручную флаг по-прежнему можно поправить.
-- Откат: drop function set_debug_mode(boolean); alter table profiles drop column debug_mode;
--        (триггер protect_profile_admin_flag вернуть из 059.)
-- Проверка: scripts/sql_harness/scenario_066_debug_mode.sql, docs/sql-checks/066_debug_mode_check.sql.

alter table profiles add column if not exists debug_mode boolean not null default false;

create or replace function protect_profile_admin_flag() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.is_admin := false;
      new.debug_mode := false;
    else
      if new.is_admin is distinct from old.is_admin then
        raise exception 'Менять права администратора из приложения нельзя' using errcode = '42501';
      end if;
      if new.debug_mode is distinct from old.debug_mode then
        raise exception 'Режим отладки включается только через set_debug_mode' using errcode = '42501';
      end if;
    end if;
  end if;
  -- не администратор (в том числе отозванный вручную) в режиме отладки быть не может — для любой роли
  if not coalesce(new.is_admin, false) then
    new.debug_mode := false;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_admin_flag on profiles;
create trigger protect_profile_admin_flag
  before insert or update on profiles
  for each row execute function protect_profile_admin_flag();

create or replace function set_debug_mode(p_on boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Нужно войти в аккаунт' using errcode = '28000';
  end if;
  if not exists (select 1 from profiles p where p.user_id = v_user and coalesce(p.is_admin, false)) then
    raise exception 'Режим отладки — только для администратора' using errcode = '42501';
  end if;
  update profiles set debug_mode = coalesce(p_on, false) where user_id = v_user;
  return coalesce(p_on, false);
end $$;

revoke all on function set_debug_mode(boolean) from public, anon;
grant execute on function set_debug_mode(boolean) to authenticated;
