-- migrations/009_admin.sql
-- Права администратора: просмотр всех пользователей и удаление ненужных аккаунтов.
-- Безопасно: только добавляет колонку и функции с проверкой прав внутри.

alter table profiles add column if not exists is_admin boolean default false;

drop function if exists admin_list_users();
create or replace function admin_list_users()
returns table(user_id uuid, email text, display_name text, is_admin boolean, created_at timestamptz) as $$
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and is_admin = true) then
    raise exception 'Доступ только для администраторов';
  end if;
  return query
  select u.id, u.email::text, p.display_name, coalesce(p.is_admin, false), u.created_at
  from auth.users u
  left join profiles p on p.user_id = u.id
  order by u.created_at desc;
end;
$$ language plpgsql security definer;

drop function if exists admin_delete_user(uuid);
create or replace function admin_delete_user(target_user uuid)
returns void as $$
begin
  if not exists (select 1 from profiles where user_id = auth.uid() and is_admin = true) then
    raise exception 'Доступ только для администраторов';
  end if;
  if target_user = auth.uid() then
    raise exception 'Нельзя удалить самого себя через эту функцию';
  end if;
  delete from auth.users where id = target_user;
end;
$$ language plpgsql security definer;

grant execute on function admin_list_users() to authenticated;
grant execute on function admin_delete_user(uuid) to authenticated;

-- ===== Поиск друга по нику (не только по email) =====
drop function if exists find_user_by_name(text);
create or replace function find_user_by_name(lookup_name text)
returns uuid language sql security definer as $$
  select user_id from profiles where display_name = lookup_name limit 1;
$$;
grant execute on function find_user_by_name(text) to authenticated;

-- ===== Сделать себя администратором =====
-- Замени 'твой@email.com' на свой реальный email и выполни отдельно (уже после гонки
-- всего файла выше), либо сразу впиши вместо плейсхолдера перед запуском всего файла:
--
-- update profiles set is_admin = true
-- where user_id = (select id from auth.users where email = 'твой@email.com');
