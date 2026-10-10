-- Сценарий для run.sh 064: настройки между устройствами, profiles.ui_settings (миграция 064, BACKLOG 48.3). Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant all on all tables in schema public to authenticated; -- как в Supabase по умолчанию; RLS проверяем ролью authenticated (суперпользователь RLS обходит)
grant all on pg_temp.res to public;
grant all on sequence pg_temp.res_n_seq to public; -- проверки пишутся и под ролью authenticated
create or replace function pg_temp.as_client(u uuid) returns void as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$ language plpgsql;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); n int; v jsonb; e text; col int;
begin
  insert into auth.users(id) values (a), (b);
  insert into profiles(user_id, display_name) values (a, 'A'), (b, 'B');

  -- 01 колонка есть, jsonb, NOT NULL, по умолчанию пустой объект
  select count(*) into col from information_schema.columns where table_name = 'profiles' and column_name = 'ui_settings' and data_type = 'jsonb' and is_nullable = 'NO';
  perform pg_temp.check_('01 колонка jsonb not null', '1', col::text);
  select ui_settings into v from profiles where user_id = a;
  perform pg_temp.check_('02 по умолчанию {}', '{}', v::text);

  -- 03 повторный запуск миграции безопасен
  e := '';
  begin execute 'alter table profiles add column if not exists ui_settings jsonb not null default ''{}''::jsonb'; exception when others then e := sqlstate; end;
  perform pg_temp.check_('03 повторное применение без ошибки', '', e);

  -- 04 владелец пишет и читает свои настройки (под ролью authenticated, через RLS)
  perform pg_temp.as_client(a);
  set local role authenticated;
  update profiles set ui_settings = '{"site_theme":"mint","site_lang":"ru"}'::jsonb where user_id = a;
  get diagnostics n = row_count;
  perform pg_temp.check_('04 владелец обновил свою строку', '1', n::text);
  select ui_settings into v from profiles where user_id = a;
  reset role;
  perform pg_temp.check_('05 значения сохранились как есть', 'mint|ru', (v->>'site_theme') || '|' || (v->>'site_lang'));

  -- 06 чужой пользователь не видит и не может менять чужие настройки
  perform pg_temp.as_client(b);
  set local role authenticated;
  select count(*) into n from profiles where user_id = a;
  perform pg_temp.check_('06 чужую строку профиля не видно', '0', n::text);
  update profiles set ui_settings = '{"site_theme":"hacked"}'::jsonb where user_id = a;
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.check_('07 чужую строку не обновить', '0', n::text);
  select ui_settings->>'site_theme' into e from profiles where user_id = a;
  perform pg_temp.check_('08 настройки владельца не изменились', 'mint', e);

  -- 09 null-значение и удаление ключа: клиент хранит «не задано» как отсутствие ключа
  perform pg_temp.as_client(a);
  set local role authenticated;
  update profiles set ui_settings = ui_settings - 'site_lang' where user_id = a;
  select ui_settings into v from profiles where user_id = a;
  reset role;
  perform pg_temp.check_('09 ключ удаляется, остальные остаются', '{"site_theme": "mint"}', v::text);

  -- 10 NOT NULL: записать null в колонку нельзя (клиент не сможет «обнулить» всё и сломать чтение)
  e := '';
  begin update profiles set ui_settings = null where user_id = a; exception when others then e := sqlstate; end;
  perform pg_temp.check_('10 null в колонку -> 23502', '23502', e);

  -- 11 настройки не утекают через публичные выдачи: лидерборд отдаёт только свои колонки, без ui_settings
  perform pg_temp.as_client(b);
  select count(*) into n from get_leaderboard_period('all') l where to_jsonb(l) ? 'ui_settings';
  perform pg_temp.check_('11 лидерборд без ui_settings', '0', n::text);
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
