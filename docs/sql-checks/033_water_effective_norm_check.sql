-- Проверка migrations/033_water_effective_norm.sql (Supabase -> SQL Editor). Только чтение: ничего не меняет.
-- Запускать ПОСЛЕ применения миграции (пункты используют её функции). Пункт 2 показывает, кого она задела.

-- 1) Помощники созданы: должно вернуться 4 строки.
select proname from pg_proc
where proname in ('is_water_like', 'is_weight_like', 'water_auto_norm_ml', 'metric_null_goal')
order by proname;

-- 2) У кого вода без заданной нормы (считается по авто-норме) и сколько ПРОШЛЫХ дней перестанут давать балл:
--    effective_goal — норма, по которой теперь считается вода; days_losing_point — дней с записью воды ниже неё
--    (раньше каждый такой день давал +1). Пусто — миграция никого не заденет.
select p.display_name,
       m.name as metric,
       metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon) as effective_goal,
       count(*) filter (where (dv.value)::numeric < metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon)) as days_losing_point,
       count(*) as days_with_water
from metrics m
join profiles p on p.user_id = m.user_id
join daily_values dv on dv.metric_id = m.id
where m.active = true and m.type = 'number' and m.goal_value is null
  and is_water_like(m.icon, m.name)
  and metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon) > 0
group by p.display_name, m.id, m.user_id, m.type, m.name, m.icon
order by days_losing_point desc;

-- 3) Рабочие функции вызываются без ошибок и дают числа (баллы за сегодня и за категорию).
select display_name, today_points from get_today_activity() limit 5;
select display_name, category_points, category_streak from get_category_leaderboard('pushups', 'week') limit 5;

-- 4) Права: помощники закрыты от вошедших пользователей (иначе через них можно было бы узнать чужой вес) — везде false;
--    рабочие функции остались доступны — true.
select has_function_privilege('authenticated', 'water_auto_norm_ml(uuid)', 'execute') as helper_water_auto_norm_ml,
       has_function_privilege('authenticated', 'metric_null_goal(uuid, uuid, text, text, text)', 'execute') as helper_metric_null_goal,
       has_function_privilege('authenticated', 'calc_user_points(uuid)', 'execute') as calc_user_points,
       has_function_privilege('authenticated', 'get_category_leaderboard(text, text)', 'execute') as get_category_leaderboard;
