-- Проверка после применения migrations/037_streak_from_yesterday.sql (Supabase -> SQL Editor). Только чтение.
-- 1) Серии пользователей: после правки у тех, кто уже сегодня внёс часть метрик, серия не должна быть 0, если вчера всё было сделано.
select display_name, calc_perfect_streak(user_id) as perfect_streak, user_today(user_id) as local_today
from profiles order by perfect_streak desc limit 10;
-- 2) Серия по категории (подставьте ключ вашей категории, например 'pushups').
select display_name, category_streak from get_category_leaderboard('pushups', 'week') order by category_streak desc limit 10;
-- 3) Норма воды в расчёте серии по-прежнему учитывается (должно вернуть эффективную норму, а не 0):
select m.name, metric_null_goal(m.id, m.user_id, m.type, m.name, m.icon) as effective_goal from metrics m where m.goal_value is null and m.icon in ('svg:droplet','💧') limit 5;
