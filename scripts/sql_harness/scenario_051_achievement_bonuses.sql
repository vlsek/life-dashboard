-- Сценарий для scripts/sql_harness/run.sh: бонусные монеты за достижения (миграция 051; BACKLOG раздел 37). Печатает строки: OK или РАСХОЖДЕНИЕ.
-- Запускать ТОЛЬКО на тестовой БД стенда (создаёт пользователей), не в рабочей Supabase.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, actual text);

-- Выполнить stmt от имени роли с auth.uid() = uid; вернуть 'ok' или SQLSTATE ошибки (42501 — нет прав/RLS, 23505 — дубль, 23514 — check).
create or replace function pg_temp.try_as(uid uuid, role_name text, stmt text) returns text as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  execute format('set local role %I', role_name);
  begin
    execute stmt;
    execute 'reset role';
    return 'ok';
  exception when others then
    execute 'reset role';
    return sqlstate;
  end;
end $$ language plpgsql;

create or replace function pg_temp.cnt_as(uid uuid, q text) returns int as $$
declare n int;
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  set local role authenticated;
  execute q into n;
  reset role;
  return n;
end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); m uuid := gen_random_uuid(); pts_before numeric; pts_after numeric; lb_before numeric; lb_after numeric; cp_before numeric; cp_after numeric; cat uuid;
begin
  insert into auth.users(id) values (a), (b);
  insert into profiles(user_id) values (a), (b);
  select id into cat from metric_categories where key = 'pushups';

  -- 1. свои строки: добавить можно
  insert into res(name, expected, actual) values ('01 добавить свой бонус', 'ok', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''words_10'', 20)', a)));
  -- 2. повторная выдача того же ключа — отклонена базой (один раз на значок)
  insert into res(name, expected, actual) values ('02 повторная вставка того же ключа — дубль (23505)', '23505', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''words_10'', 20)', a)));
  -- 3. идемпотентная выдача (как делает клиент: ON CONFLICT DO NOTHING) — без ошибки и без второй строки
  insert into res(name, expected, actual) values ('03 on conflict do nothing — без ошибки', 'ok', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''words_10'', 99) on conflict (user_id, key) do nothing', a)));
  insert into res(name, expected, actual) values ('04 после «повторной выдачи» строка одна и монет по-прежнему 20', '1/20.0', (select count(*) || '/' || max(coins) from achievement_bonuses where user_id = a and key = 'words_10'));
  -- 5. другой ключ — отдельный бонус
  insert into res(name, expected, actual) values ('05 другой ключ — отдельная строка', 'ok', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''words_25'', 50)', a)));
  -- 6. чужой user_id — запрещено RLS
  insert into res(name, expected, actual) values ('06 выдать бонус ЧУЖОМУ пользователю — RLS (42501)', '42501', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''goals_10'', 20)', b)));
  -- 7. границы монет
  insert into res(name, expected, actual) values
    ('07 coins = 0 — check (23514)', '23514', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''k0'', 0)', a))),
    ('08 coins < 0 — check (23514)', '23514', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''kneg'', -5)', a))),
    ('09 coins = 501 — check (23514)', '23514', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''kbig'', 501)', a))),
    ('10 coins = 500 — допустимо', 'ok', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''kmax'', 500)', a))),
    ('11 coins = 0,1 — допустимо (дробные баллы)', 'ok', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''kmin'', 0.1)', a))),
    ('12 пустой ключ — check (23514)', '23514', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, '''', 10)', a))),
    ('13 слишком длинный ключ — check (23514)', '23514', pg_temp.try_as(a, 'authenticated', format('insert into achievement_bonuses(user_id, key, coins) values (%L, repeat(''x'', 81), 10)', a)));
  -- 14. выданное нельзя ни изменить, ни удалить, ни «перевыдать» с другой суммой
  insert into res(name, expected, actual) values
    ('14 update своей строки запрещён (42501)', '42501', pg_temp.try_as(a, 'authenticated', format('update achievement_bonuses set coins = 500 where user_id = %L', a))),
    ('15 delete своей строки запрещён (42501)', '42501', pg_temp.try_as(a, 'authenticated', format('delete from achievement_bonuses where user_id = %L', a))),
    ('16 после попыток update/delete данные целы: words_10 = 20', '20.0', (select coins::text from achievement_bonuses where user_id = a and key = 'words_10'));
  -- 17. читать — только свои
  insert into res(name, expected, actual) values
    ('17 пользователь a видит свои строки (5: words_10, words_25, kmax, kmin + …)', '4', pg_temp.cnt_as(a, format('select count(*)::int from achievement_bonuses where user_id = %L', a))::text),
    ('18 пользователь b не видит чужих строк', '0', pg_temp.cnt_as(b, format('select count(*)::int from achievement_bonuses where user_id = %L', a))::text),
    ('19 пользователь b: select без фильтра возвращает только его (0)', '0', pg_temp.cnt_as(b, 'select count(*)::int from achievement_bonuses')::text);
  -- 20. аноним не имеет доступа
  insert into res(name, expected, actual) values
    ('20 anon: select запрещён (42501)', '42501', pg_temp.try_as(null, 'anon', 'select 1 from achievement_bonuses limit 1')),
    ('21 anon: insert запрещён (42501)', '42501', pg_temp.try_as(null, 'anon', format('insert into achievement_bonuses(user_id, key, coins) values (%L, ''z'', 10)', a)));
  -- 22. бонус НЕ входит ни в «накоплено баллов», ни в лидерборд, ни в очки категории
  insert into metrics(id, user_id, name, type, goal_value, goal_direction, category_id) values (m, a, 'm', 'boolean', null, 'at_least', cat);
  insert into daily_values(user_id, date, metric_id, value) values (a, '2026-10-01', m, 'true'), (a, '2026-10-02', m, 'true');
  select calc_user_points(a) into pts_after;
  select total_points into lb_after from get_leaderboard() where user_id = a;
  select category_points into cp_after from get_category_leaderboard('pushups', 'all') where user_id = a;
  insert into res(name, expected, actual) values
    ('22 calc_user_points не включает бонус (2 дня метрики = 2, а не 2 + 570)', '2.0', pts_after::text),
    ('23 get_leaderboard.total_points не включает бонус', '2.0', lb_after::text),
    ('24 get_category_leaderboard.category_points не включает бонус', '2.0', cp_after::numeric(10, 1)::text);
  -- 25. удаление пользователя убирает его бонусы (каскад), чужие не трогает
  delete from auth.users where id = b;
  insert into res(name, expected, actual) values ('25 каскад: бонусы пользователя a на месте после удаления b', '4', (select count(*)::text from achievement_bonuses where user_id = a));
  delete from auth.users where id = a;
  insert into res(name, expected, actual) values ('26 каскад: после удаления a его бонусов нет', '0', (select count(*)::text from achievement_bonuses where user_id = a));
end $$;

select format('%-86s | ожидалось %s | получено %s | %s', name, expected, coalesce(actual, '-'), case when expected = actual then 'OK' else 'РАСХОЖДЕНИЕ' end)
from res order by n;
