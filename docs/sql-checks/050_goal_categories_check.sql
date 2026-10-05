-- Проверка миграции 050 (только чтение).
-- 1) таблица есть, RLS включён (ожидается: goal_categories | true)
select relname, relrowsecurity from pg_class where relname = 'goal_categories';
-- 2) политика «только свои» есть (ожидается 1 строка)
select policyname from pg_policies where tablename = 'goal_categories';
-- 3) уникальный индекс по (user_id, lower(btrim(name))) есть (ожидается 1 строка)
select indexname from pg_indexes where tablename = 'goal_categories' and indexname = 'goal_categories_user_name_idx';
-- 4) перенос: у каких пользователей есть категории в целях, но нет в списке (ожидается 0 строк)
select g.user_id, lower(btrim(g.category)) as cat
from goals g
left join goal_categories c on c.user_id = g.user_id and lower(btrim(c.name)) = lower(btrim(g.category))
where g.category is not null
  and char_length(btrim(g.category)) between 1 and 40
  and lower(btrim(g.category)) not in ('без категории', 'no category')
  and c.id is null
group by g.user_id, lower(btrim(g.category));
-- 5) сколько категорий у каждого пользователя
select user_id, count(*) as categories from goal_categories group by user_id order by categories desc;
