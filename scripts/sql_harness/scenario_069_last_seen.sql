-- Сценарий для run.sh 069: отметка «был в сети» и показ только друзьям (миграция 069, BACKLOG 48.2). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant all on all tables in schema public to authenticated; -- как в Supabase по умолчанию; RLS проверяем ролью authenticated (суперпользователь RLS обходит)
grant all on pg_temp.res to public;
create or replace function pg_temp.as_client(u uuid) returns void as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$ language plpgsql;
create or replace function pg_temp.as_admin() returns void as $$ begin perform set_config('request.jwt.claim.sub', '', false); end $$ language plpgsql;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid(); d uuid := gen_random_uuid(); e uuid := gen_random_uuid();
        t1 timestamptz; t2 timestamptz; k int; err text;
begin
  insert into auth.users(id) values (a), (b), (c), (d), (e);
  insert into profiles(user_id, display_name, leaderboard_visible) values (a, 'A', true), (b, 'B', true), (c, 'C', true), (d, 'D', true), (e, 'E', true);
  insert into friendships(requester_id, addressee_id, status) values (a, b, 'accepted'), (a, d, 'accepted'), (a, e, 'pending');

  -- значения по умолчанию
  perform pg_temp.check_('01 по умолчанию show_online = true, отметки нет', 'true|true',
    (select show_online::text || '|' || (last_seen_at is null)::text from profiles where user_id = b));

  -- отметка
  perform pg_temp.as_client(b);
  perform touch_last_seen();
  select last_seen_at into t1 from profiles where user_id = b;
  perform pg_temp.check_('02 touch ставит отметку «сейчас»', 'true', (t1 is not null and t1 > now() - interval '1 minute')::text);
  perform pg_temp.as_admin();
  -- свежая отметка (10 секунд назад) не перезаписывается: не чаще раза в минуту (now() внутри транзакции постоянен, поэтому сравниваем с заданным значением)
  perform pg_temp.as_admin();
  update profiles set last_seen_at = now() - interval '10 seconds' where user_id = b;
  select last_seen_at into t1 from profiles where user_id = b;
  perform pg_temp.as_client(b);
  perform touch_last_seen();
  select last_seen_at into t2 from profiles where user_id = b;
  perform pg_temp.check_('03 отметка моложе минуты не перезаписывается (троттлинг)', 'true', (t1 = t2)::text);
  -- старая отметка обновляется
  perform pg_temp.as_admin();
  update profiles set last_seen_at = now() - interval '5 minutes' where user_id = b;
  perform pg_temp.as_client(b);
  perform touch_last_seen();
  select last_seen_at into t2 from profiles where user_id = b;
  perform pg_temp.check_('04 отметка старше минуты обновляется', 'true', (t2 > now() - interval '1 minute')::text);
  -- без входа — тихо ничего
  perform pg_temp.as_admin();
  update profiles set last_seen_at = null where user_id = c;
  perform touch_last_seen();
  perform pg_temp.check_('05 без входа touch ничего не делает и не падает', '0', (select count(*)::text from profiles where last_seen_at is not null and user_id = c));
  -- отметка только себе
  perform pg_temp.as_client(c);
  perform touch_last_seen();
  perform pg_temp.check_('06 touch меняет только свою строку', '0', (select count(*)::text from profiles where user_id in (a, b, d, e) and user_id <> b and last_seen_at is not null));

  -- показ друзьям
  perform pg_temp.as_admin();
  update profiles set last_seen_at = now() - interval '2 minutes' where user_id in (a, b, d, e);
  perform pg_temp.as_client(a);
  perform pg_temp.check_('07 друзья (принятые) видны, ожидающая заявка и посторонний — нет', '2',
    (select count(*)::text from get_friends_presence()));
  perform pg_temp.check_('08 среди видимых — именно друзья b и d', 'true',
    (select (array_agg(user_id order by user_id) = (select array_agg(x order by x) from unnest(array[b, d]) x))::text from get_friends_presence()));
  perform pg_temp.as_client(c);
  perform pg_temp.check_('09 посторонний (без друзей) не видит никого', '0', (select count(*)::text from get_friends_presence()));
  perform pg_temp.as_client(b);
  perform pg_temp.check_('10 себя в списке нет; видна a (b дружит только с a)', 'true',
    (select (count(*) = 1 and bool_and(user_id = a))::text from get_friends_presence()));

  -- приватность
  perform pg_temp.as_admin();
  update profiles set show_online = false where user_id = b;
  perform pg_temp.as_client(a);
  perform pg_temp.check_('11 show_online = false — друг скрыт', '1', (select count(*)::text from get_friends_presence()));
  perform pg_temp.as_admin();
  update profiles set show_online = true, leaderboard_visible = false where user_id = b;
  perform pg_temp.as_client(a);
  perform pg_temp.check_('12 скрыт из сообщества (leaderboard_visible = false) — тоже скрыт', '1', (select count(*)::text from get_friends_presence()));
  perform pg_temp.as_admin();
  update profiles set leaderboard_visible = true, last_seen_at = null where user_id = b;
  perform pg_temp.as_client(a);
  perform pg_temp.check_('13 нет отметки — строки нет', '1', (select count(*)::text from get_friends_presence()));

  -- RLS: чужой профиль напрямую не читается
  perform pg_temp.as_client(c);
  set local role authenticated;
  k := (select count(*) from profiles where user_id = d);
  reset role;
  perform pg_temp.check_('14 чужую отметку напрямую из profiles не прочитать (RLS)', '0', k::text);

  -- права на функции
  perform pg_temp.check_('15 anon не может вызывать функции, authenticated — может', 'false|false|true|true',
    has_function_privilege('anon', 'touch_last_seen()', 'execute')::text || '|' || has_function_privilege('anon', 'get_friends_presence()', 'execute')::text || '|' ||
    has_function_privilege('authenticated', 'touch_last_seen()', 'execute')::text || '|' || has_function_privilege('authenticated', 'get_friends_presence()', 'execute')::text);
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
