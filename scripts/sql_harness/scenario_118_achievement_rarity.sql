-- Сценарий для run.sh 118: achievement_rarity() — редкость достижений по данным. Строки OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare u uuid[] := array(select gen_random_uuid() from generate_series(1, 25)); i int; n int; m int; r record;
begin
  for i in 1 .. 25 loop insert into auth.users(id) values (u[i]); end loop;

  -- 19 человек в разделе: функция молчит
  for i in 1 .. 19 loop insert into user_achievements(user_id, key, unlocked_at) values (u[i], '_baseline', null); end loop;
  for i in 1 .. 10 loop insert into user_achievements(user_id, key, unlocked_at) values (u[i], 'first_goal', now()); end loop;
  select count(*) into n from achievement_rarity();
  perform pg_temp.check_('01 людей меньше 20 — ни одной строки (порог в базе)', '0', n::text);

  -- 20-й человек: функция заговорила
  insert into user_achievements(user_id, key, unlocked_at) values (u[20], '_baseline', null);
  select count(*) into n from achievement_rarity();
  perform pg_temp.check_('02 ровно 20 человек — строки есть', '1', n::text);
  select owners, total into r from achievement_rarity() where key = 'first_goal';
  perform pg_temp.check_('03 first_goal: открыли 10 человек', '10', r.owners::text);
  perform pg_temp.check_('04 всего людей раздела 20', '20', r.total::text);

  -- служебные ключи не отдаются
  perform pg_temp.check_('05 ключ _baseline не отдаётся', '0', (select count(*)::text from achievement_rarity() where key like '\_%' escape '\'));
  insert into user_achievements(user_id, key, unlocked_at) values (u[1], '_service', now());
  perform pg_temp.check_('06 любой ключ с «_» в начале не отдаётся', '0', (select count(*)::text from achievement_rarity() where key like '\_%' escape '\'));

  -- unlocked_at = NULL (выполнено до появления раздела) тоже «открыто»
  insert into user_achievements(user_id, key, unlocked_at) values (u[11], 'streak_30', null), (u[12], 'streak_30', now());
  perform pg_temp.check_('07 открытое «до появления раздела» (NULL) считается', '2', (select owners::text from achievement_rarity() where key = 'streak_30'));

  -- каждый человек считается один раз на ключ и один раз в знаменателе
  perform pg_temp.check_('08 знаменатель — разные люди, а не строки', '20', (select max(total)::text from achievement_rarity()));
  for i in 21 .. 25 loop insert into user_achievements(user_id, key, unlocked_at) values (u[i], 'points_500', now()), (u[i], 'first_goal', now()); end loop;
  perform pg_temp.check_('09 новые люди попадают в знаменатель', '25', (select max(total)::text from achievement_rarity()));
  perform pg_temp.check_('10 first_goal теперь у 15', '15', (select owners::text from achievement_rarity() where key = 'first_goal'));
  perform pg_temp.check_('11 points_500 у 5', '5', (select owners::text from achievement_rarity() where key = 'points_500'));

  -- никаких идентификаторов в ответе
  perform pg_temp.check_('12 в ответе только key, owners, total (без user_id и дат)', 'key,owners,total',
    (select string_agg(a.attname, ',' order by a.attnum) from pg_proc p join pg_type t on t.oid = p.prorettype
       join lateral (select unnest(p.proargnames) as attname, generate_series(1, array_length(p.proargnames, 1)) as attnum) a on true
      where p.proname = 'achievement_rarity' and a.attnum > coalesce(array_length(p.proargtypes::oid[], 1), 0)));

  -- права: вошедшие могут, anon и public — нет
  perform pg_temp.check_('13 authenticated может вызывать', 'true', has_function_privilege('authenticated', 'achievement_rarity()', 'execute')::text);
  perform pg_temp.check_('14 anon не может вызывать', 'false', has_function_privilege('anon', 'achievement_rarity()', 'execute')::text);
  perform pg_temp.check_('15 функция security definer, search_path зафиксирован', 'true,true',
    (select p.prosecdef::text || ',' || (p.proconfig::text like '%search_path=public%')::text from pg_proc p where p.proname = 'achievement_rarity'));

  -- в Supabase роль authenticated получает права на таблицы по умолчанию; в стенде выдаём явно (проверяем именно RLS, а не права)
  grant select on user_achievements to authenticated;
  -- RLS таблицы не нарушена: от имени обычного пользователя таблица по-прежнему отдаёт только его строки, а функция — агрегат
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', u[1]::text, true);
  select count(*) into n from user_achievements;
  select count(*) into m from achievement_rarity();
  reset role;
  perform pg_temp.check_('16 прямой select таблицы по-прежнему видит только свои строки', 'true', (n > 0 and n <= 4)::text);
  perform pg_temp.check_('17 а функция отдаёт агрегат по всем (security definer)', 'true', (m >= 3)::text);

  -- удаление человека каскадно убирает его из подсчёта
  delete from auth.users where id = u[25];
  perform pg_temp.check_('18 удалённый человек уходит из знаменателя', '24', (select max(total)::text from achievement_rarity()));

  -- падение ниже порога снова замолкает
  for i in 21 .. 24 loop delete from auth.users where id = u[i]; end loop;
  perform pg_temp.check_('19 ровно 20 человек после ухода пятерых — функция ещё отвечает', '20', (select max(total)::text from achievement_rarity()));
  delete from auth.users where id = u[20];
  perform pg_temp.check_('20 ушёл ещё один (19 человек) — функция снова молчит', '0', (select count(*)::text from achievement_rarity()));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || got end from res order by n;
