-- Проверка миграции 053 (только чтение).
-- 1) триггер есть и включён (ожидается 1 строка: goals_points_by_difficulty | O)  — «O» = включён
select tgname, tgenabled from pg_trigger where tgname = 'goals_points_by_difficulty' and not tgisinternal;
-- 2) функция есть (ожидается 1 строка)
select proname from pg_proc where proname = 'goals_points_by_difficulty';
-- 3) справочно: у скольких целей баллы не по шкале 5/10/15 (это СТАРЫЕ цели — по решению владельца их не приводим; новые сюда не попадут)
select points, count(*) as goals from goals where points is null or points not in (5, 10, 15) group by points order by points;
-- 4) справочно: у новых целей (созданных после применения) баллы всегда по сложности — несовпадений быть не должно (ожидается 0 строк после того,
--    как вы создадите хотя бы одну новую цель; старые цели с другой сложностью/баллами сюда могут попасть — смотрите по created_at)
select id, created_at, difficulty, points from goals
where created_at > now() - interval '1 day'
  and points is distinct from (case difficulty when 'easy' then 5 when 'medium' then 10 when 'hard' then 15 else 5 end);
