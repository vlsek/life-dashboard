-- Сценарий для run.sh 066: режим отладки администратора (миграция 066, BACKLOG 47.4 + 47.6 срез 5). Всё — от лица ОБЫЧНОГО пользователя (роль authenticated, RLS включён).
-- Печатает OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant all on pg_temp.res to public;
grant all on sequence pg_temp.res_n_seq to public;
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true);
  execute 'set local role authenticated';
end $f$;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void language plpgsql as $f$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $f$;

do $$
declare adm uuid := gen_random_uuid(); usr uuid := gen_random_uuid(); oth uuid := gen_random_uuid();
        code text; n int; r boolean; uc int; pay int;
begin
  insert into auth.users(id, email) values (adm, 'adm@x'), (usr, 'usr@x'), (oth, 'oth@x');
  insert into profiles(user_id, display_name) values (adm, 'Админ'), (usr, 'Обычный'), (oth, 'Другой');
  update profiles set is_admin = true where user_id = adm; -- вручную, как в SQL Editor

  perform pg_temp.check_('01 колонка debug_mode есть (boolean not null)', '1', (select count(*) from information_schema.columns where table_name = 'profiles' and column_name = 'debug_mode' and data_type = 'boolean' and is_nullable = 'NO')::text);
  perform pg_temp.check_('02 по умолчанию выключен', 'false', (select debug_mode::text from profiles where user_id = usr));

  -- 03–04 обычный пользователь: ни напрямую, ни функцией
  perform pg_temp.as_user(usr);
  code := 'none';
  begin update profiles set debug_mode = true where user_id = usr; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('03 обычный: прямое включение → 42501', '42501', code);
  perform pg_temp.as_user(usr);
  code := 'none';
  begin perform set_debug_mode(true); exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('04 обычный: set_debug_mode → 42501', '42501', code);
  perform pg_temp.check_('05 у обычного флаг остался false', 'false', (select debug_mode::text from profiles where user_id = usr));

  -- 06–07 админ: функция включает, прямая правка запрещена
  perform pg_temp.as_user(adm);
  r := set_debug_mode(true);
  reset role;
  perform pg_temp.check_('06 админ включил себе через функцию', 'true|true', r::text || '|' || (select debug_mode::text from profiles where user_id = adm));
  perform pg_temp.as_user(adm);
  code := 'none';
  begin update profiles set debug_mode = false where user_id = adm; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('07 админ: прямая правка флага → 42501 (только функцией)', '42501', code);

  -- 08 обычные поля профиля админ по-прежнему пишет (апсерт без debug_mode не ломается, режим сохраняется)
  perform pg_temp.as_user(adm);
  update profiles set display_name = 'Админ 2' where user_id = adm;
  reset role;
  perform pg_temp.check_('08 обычная правка профиля работает, режим не сброшен', 'Админ 2|true', (select display_name || '|' || debug_mode::text from profiles where user_id = adm));

  -- 09 «примерка» ничего не выдаёт: режим сам по себе не создаёт предметов и не списывает монеты
  select count(*) into uc from user_customizations where user_id = adm;
  select count(*) into pay from shop_items where user_id = adm;
  perform pg_temp.check_('09 режим не выдаёт предметов и не пишет покупок', '0|0', uc::text || '|' || pay::text);

  -- 10 админ: выключение функцией
  perform pg_temp.as_user(adm);
  r := set_debug_mode(false);
  reset role;
  perform pg_temp.check_('10 админ выключил через функцию', 'false|false', r::text || '|' || (select debug_mode::text from profiles where user_id = adm));

  -- 11 чужой админ-флаг и режим не видны и не меняются другим пользователем (RLS)
  perform pg_temp.as_user(adm); perform set_debug_mode(true); reset role;
  perform pg_temp.as_user(oth);
  update profiles set debug_mode = false where user_id = adm;
  get diagnostics n = row_count;
  reset role;
  perform pg_temp.check_('11 чужую строку обновить нельзя (0 строк), режим цел', '0|true', n::text || '|' || (select debug_mode::text from profiles where user_id = adm));

  -- 12 админ отозван вручную → режим отладки гаснет сам
  update profiles set is_admin = false where user_id = adm;
  perform pg_temp.check_('12 отозванный админ: режим выключен автоматически', 'false', (select debug_mode::text from profiles where user_id = adm));
  update profiles set debug_mode = true where user_id = adm; -- даже вручную нельзя включить НЕ админу
  perform pg_temp.check_('13 не админу режим не включить даже вручную', 'false', (select debug_mode::text from profiles where user_id = adm));

  -- 14 при создании профиля клиентом флаги обнуляются
  delete from profiles where user_id = oth;
  perform pg_temp.as_user(oth);
  insert into profiles(user_id, display_name, is_admin, debug_mode) values (oth, 'Новый', true, true);
  reset role;
  perform pg_temp.check_('14 вставка клиента: is_admin и debug_mode обнулены', 'false|false', (select is_admin::text || '|' || debug_mode::text from profiles where user_id = oth));

  -- 15 анонимная роль вызвать функцию не может
  -- без входа (claim пуст): если бы право вызова у anon было, функция ответила бы «Нужно войти» (28000); отказ по ПРАВАМ даёт 42501
  perform set_config('request.jwt.claim.sub', '', true);
  code := 'none';
  begin
    set local role anon;
    perform set_debug_mode(true);
  exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('15 anon: у роли нет права вызвать set_debug_mode (42501, а не 28000)', '42501', code);

  -- 16 охрана is_admin из 059 жива: админ-флаг из приложения по-прежнему не выдать
  perform pg_temp.as_user(usr);
  code := 'none';
  begin update profiles set is_admin = true where user_id = usr; exception when others then code := sqlstate; end;
  reset role;
  perform pg_temp.check_('16 самовыдача is_admin по-прежнему запрещена (059)', '42501', code);
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
