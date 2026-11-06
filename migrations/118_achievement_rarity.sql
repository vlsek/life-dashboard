-- 118_achievement_rarity.sql
-- «Редкость по данным» для достижений (BACKLOG 78.8, срез 1, агент 6): на карточке «Открыли N% людей».
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Что даёт: одна функция achievement_rarity() — для каждого ключа достижения число открывших и общее число людей.
--   key    — ключ из реестра web-achievements (first_goal, streak_30 …); служебные строки (`_baseline` и любые, начинающиеся с «_») не отдаются;
--   owners — сколько РАЗНЫХ людей открыли достижение (строка с unlocked_at = NULL — «выполнено до появления раздела» — тоже открыто);
--   total  — сколько разных людей вообще заглядывало в раздел (у кого есть хотя бы одна строка в user_achievements; у каждого такая есть
--            после первого захода — служебная `_baseline`). Знаменатель — «люди раздела», а не все аккаунты: пустые аккаунты редкость не завышают.
-- Приватность: функция отдаёт ТОЛЬКО числа — ни идентификаторов, ни дат, ни кто именно открыл. Сама же молчит (0 строк), пока людей в разделе
--   меньше 20: на маленькой выборке процент мало что значит и мог бы выдать конкретного человека. Порог — в базе, а не в приложении,
--   поэтому обойти его запросом нельзя. Читать функцию могут только вошедшие (authenticated), anon — нет.
-- Саму таблицу user_achievements функция не меняет (RLS «только свои строки» остаётся как была); читает её от имени владельца (security definer).
-- Без этой миграции страница достижений работает как раньше (строки «Открыли N% людей» просто нет).
-- Откат: drop function achievement_rarity();

create or replace function achievement_rarity()
returns table (key text, owners bigint, total bigint)
language sql
security definer
stable
set search_path = public
as $$
  with people as (
    select count(distinct user_id)::bigint as n from user_achievements
  )
  select ua.key, count(distinct ua.user_id)::bigint as owners, (select n from people) as total
  from user_achievements ua
  where (select n from people) >= 20
    and ua.key not like '\_%' escape '\'
  group by ua.key
$$;

revoke all on function achievement_rarity() from public;
revoke all on function achievement_rarity() from anon;
grant execute on function achievement_rarity() to authenticated;
