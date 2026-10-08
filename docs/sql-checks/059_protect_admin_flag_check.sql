-- Проверка ПОСЛЕ применения migrations/059_protect_admin_flag.sql (BACKLOG 47.6). Выполнять в Supabase SQL Editor.

-- 1) Триггер на месте: должна вернуться ОДНА строка.
select tgname from pg_trigger
where tgrelid = 'profiles'::regclass and tgname = 'protect_profile_admin_flag' and not tgisinternal;

-- 2) Кто сейчас администратор. В списке должны быть ТОЛЬКО вы. Незнакомая запись значит, что дырой воспользовались ДО исправления.
select p.user_id, u.email, p.display_name, p.is_admin
from profiles p join auth.users u on u.id = p.user_id
where p.is_admin;

-- 3) Если нашёлся лишний админ — снять права вручную (миграция уже выданные права НЕ отзывает):
--    update profiles set is_admin = false where user_id = '<id из пункта 2>';

-- 4) Сверка числа пользователей с ожидаемым (если кто-то пропал — вероятно, удалён через admin_delete_user).
select count(*) as users from auth.users;
