-- Сценарий для run.sh 062: серверная выдача бонусных монет за достижения (BACKLOG 47.6, срез 3). Всё — от лица ОБЫЧНОГО пользователя (роль authenticated, RLS включён).
\set ON_ERROR_STOP 0
\pset format unaligned
\pset tuples_only on
create temp table res(name text, expected numeric, got numeric);
grant select, insert, update, delete on all tables in schema public to authenticated;   -- как стандартные права Supabase; 062 отзывает лишнее у achievement_bonuses ниже
grant execute on all functions in schema public to authenticated;
grant select, insert on res to authenticated;

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), true);
  execute 'set local role authenticated';
end $f$;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
        n int; code text; total numeric; ids text;
begin
  insert into auth.users(id, email) values (a, 'a@x'), (b, 'b@x'), (c, 'c@x');
  insert into profiles(user_id, display_name) values (a, 'А'), (b, 'Б'), (c, 'В');
  -- у A три значка: два с монетами (words_10 → 20, words_25 → 50), один без (streak_30 — награда предмет), плюс выдуманный ключ
  insert into user_achievements(user_id, key) values (a, 'words_10'), (a, 'words_25'), (a, 'streak_30'), (a, 'no_such_badge');

  select count(*), sum(coins) into n, total from achievement_bonus_catalog;
  insert into res select 'каталог: 16 значков', 16, n;
  insert into res select 'каталог: 8×20 + 8×50 = 560 монет за всю жизнь', 560, total;

  perform pg_temp.as_user(a);
  select string_agg(key || '=' || coins::int, ',' order by key) into ids from claim_achievement_bonuses();
  reset role;
  insert into res select 'выдано ровно за words_10 (20) и words_25 (50)', 1, (ids = 'words_10=20,words_25=50')::int;
  insert into res select 'в таблице бонусов у A две строки на 70', 70, (select coalesce(sum(coins), 0) from achievement_bonuses where user_id = a);
  insert into res select 'за значок без монет и за выдуманный ключ ничего нет', 0, (select count(*) from achievement_bonuses where user_id = a and key in ('streak_30', 'no_such_badge'));

  perform pg_temp.as_user(a);
  select count(*) into n from claim_achievement_bonuses();
  reset role;
  insert into res select 'повторная выдача ничего не добавляет (идемпотентно)', 0, n;
  insert into res select 'сумма после повтора по-прежнему 70', 70, (select sum(coins) from achievement_bonuses where user_id = a);

  -- новый значок открыт позже → доплачивается только он
  insert into user_achievements(user_id, key) values (a, 'learned_10');
  perform pg_temp.as_user(a);
  select string_agg(key || '=' || coins::int, ',') into ids from claim_achievement_bonuses();
  reset role;
  insert into res select 'позже открытый значок доплачивается один раз (learned_10 = 20)', 1, (ids = 'learned_10=20')::int;

  perform pg_temp.as_user(b);
  select count(*) into n from claim_achievement_bonuses();
  reset role;
  insert into res select 'без значков монет нет', 0, n;

  -- чужие значки не помогают
  perform pg_temp.as_user(c);
  select count(*) into n from claim_achievement_bonuses();
  reset role;
  insert into res select 'чужие значки (у A) не дают монет пользователю C', 0, (select count(*) from achievement_bonuses where user_id = c);

  -- взлом: прямая запись клиентом закрыта (в этом стенде права выданы заново, поэтому проверяем и политику RLS, и отозванное право)
  perform pg_temp.as_user(b);
  begin insert into achievement_bonuses(user_id, key, coins) values (b, 'придуманный_ключ', 500); code := 'none'; exception when others then code := sqlstate; end;
  reset role;
  insert into res select 'прямая вставка бонуса клиентом отклонена', 1, (code <> 'none')::int;
  insert into res select 'у B по-прежнему 0 монет', 0, (select count(*) from achievement_bonuses where user_id = b);

  perform pg_temp.as_user(a);
  begin update achievement_bonuses set coins = 500 where user_id = a; exception when others then null; end;
  begin delete from achievement_bonuses where user_id = a; exception when others then null; end;
  reset role;
  insert into res select 'суммы A не подделать и не стереть (3 строки по 20/50/20 = 90)', 90, (select coalesce(sum(coins), 0) from achievement_bonuses where user_id = a);

  -- каталог: читать можно, писать нельзя
  perform pg_temp.as_user(b);
  select count(*) into n from achievement_bonus_catalog;
  begin update achievement_bonus_catalog set coins = 500 where key = 'words_10'; exception when others then null; end;
  begin insert into achievement_bonus_catalog(key, coins) values ('свой_значок', 500); exception when others then null; end;
  reset role;
  insert into res select 'каталог читается (16 строк)', 16, n;
  insert into res select 'сумму в каталоге клиент не меняет', 20, (select coins from achievement_bonus_catalog where key = 'words_10');
  insert into res select 'свой значок в каталог не добавить', 0, (select count(*) from achievement_bonus_catalog where key = 'свой_значок');

  -- свои строки читаются (клиентское чтение остаётся)
  perform pg_temp.as_user(a);
  select count(*) into n from achievement_bonuses;
  reset role;
  insert into res select 'A видит только свои 3 строки (RLS на чтение)', 3, n;

  perform pg_temp.as_user(null);
  begin perform claim_achievement_bonuses(); code := 'none'; exception when others then code := sqlstate; end;
  reset role;
  insert into res select 'без входа → 28000', 1, (code = '28000')::int;
end $$;
select format('%-70s | ожидалось %s | получено %s | %s', name, expected, got, case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end) from res;
