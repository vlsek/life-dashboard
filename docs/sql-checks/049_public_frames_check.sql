-- Проверка миграции 049 (только чтение).
-- 1) функция существует
select proname from pg_proc where proname = 'get_public_frames';
-- 2) каждая отданная рамка реально открыта у владельца (ожидается 0)
select count(*) as not_owned
from get_public_frames() f
left join user_customizations c on c.user_id = f.user_id and c.item_key = f.frame
where c.item_key is null;
