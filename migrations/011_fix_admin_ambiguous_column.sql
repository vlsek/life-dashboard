-- migrations/011_fix_admin_ambiguous_column.sql
-- Фикс бага "column reference user_id is ambiguous" в админке.
-- Причина: функция admin_list_users() объявлена как RETURNS TABLE(user_id uuid, ...),
-- а внутри тела функции "user_id" без указания таблицы одновременно мог означать и эту
-- выходную колонку, и profiles.user_id — Postgres не мог понять, что имелось в виду,
-- и падал с ошибкой ДО того, как вообще успевал проверить, админ ты или нет.
-- Именно поэтому is_admin = true не помогал — ошибка на уровне разбора SQL, а не прав доступа.

drop function if exists admin_list_users();
create or replace function admin_list_users()
returns table(user_id uuid, email text, display_name text, is_admin boolean, created_at timestamptz) as $$
begin
  if not exists (select 1 from profiles pr where pr.user_id = auth.uid() and pr.is_admin = true) then
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
  if not exists (select 1 from profiles pr where pr.user_id = auth.uid() and pr.is_admin = true) then
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
