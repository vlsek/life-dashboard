-- Сценарий для scripts/sql_harness/run.sh: флаг profiles.track_water (миграция 055; BACKLOG 932). Печатает строки: OK или РАСХОЖДЕНИЕ.
-- Запускать ТОЛЬКО на тестовой БД стенда, не в рабочей Supabase.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare u uuid := gen_random_uuid(); v text; failed boolean := false;
begin
  insert into auth.users(id) values (u);
  insert into profiles(user_id) values (u);
  perform pg_temp.check_('01 новый профиль: вода включена по умолчанию', 'true', (select track_water::text from profiles where user_id = u));

  update profiles set track_water = false where user_id = u;
  perform pg_temp.check_('02 выключили -> false', 'false', (select track_water::text from profiles where user_id = u));

  -- upsert, как делает клиент: только user_id + track_water; другие колонки профиля не трогаются
  update profiles set favorite_pages = '["goals"]'::jsonb where user_id = u;
  insert into profiles(user_id, track_water) values (u, true) on conflict (user_id) do update set track_water = excluded.track_water;
  perform pg_temp.check_('03 upsert включил обратно -> true', 'true', (select track_water::text from profiles where user_id = u));
  perform pg_temp.check_('04 upsert не затронул другие колонки профиля', '["goals"]', (select favorite_pages::text from profiles where user_id = u));

  begin
    update profiles set track_water = null where user_id = u;
  exception when not_null_violation then failed := true;
  end;
  perform pg_temp.check_('05 NULL запрещён (not null)', 'true', failed::text);

  perform pg_temp.check_('06 тип колонки — boolean, not null, default true',
    'boolean|NO|true',
    (select data_type || '|' || is_nullable || '|' || column_default from information_schema.columns where table_name = 'profiles' and column_name = 'track_water'));
end $$;

select n || ' | ' || name || ' | ожидалось ' || expected || ', получено ' || got || ' | ' || case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end from res order by n;
