-- Проверка миграции 077 (read-only): функция есть, права только у authenticated.
select proname, prosecdef as security_definer from pg_proc where proname = 'get_friend_wishlist';
select grantee, privilege_type from information_schema.routine_privileges where routine_name = 'get_friend_wishlist' order by 1;
-- Вручную под своим пользователем: select get_friend_wishlist(auth.uid());
