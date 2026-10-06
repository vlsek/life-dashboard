-- Сценарий для scripts/sql_harness/run.sh: баллы цели по сложности на сервере (миграция 053; BACKLOG раздел 35/40). Печатает строки: OK или РАСХОЖДЕНИЕ.
-- Запускать ТОЛЬКО на тестовой БД стенда, не в рабочей Supabase. Клиент имитируется заданием request.jwt.claim.sub (auth.uid() не NULL),
-- администратор (SQL Editor / service role) — пустым значением.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);

create or replace function pg_temp.as_client(u uuid) returns void as $$ begin perform set_config('request.jwt.claim.sub', u::text, false); end $$ language plpgsql;
create or replace function pg_temp.as_admin() returns void as $$ begin perform set_config('request.jwt.claim.sub', '', false); end $$ language plpgsql;
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;

do $$
declare u uuid := gen_random_uuid(); g uuid; v text; e text;
begin
  insert into auth.users(id) values (u);
  perform pg_temp.as_client(u);

  -- создание: баллы по сложности, что бы ни прислал клиент
  insert into goals(user_id, name, points, difficulty) values (u, 'easy', 999, 'easy') returning id into g;
  perform pg_temp.check_('01 создание, лёгкая, клиент прислал 999 -> 5', '5', (select points::text from goals where id = g));
  insert into goals(user_id, name, points, difficulty) values (u, 'medium', 1, 'medium') returning id into g;
  perform pg_temp.check_('02 создание, средняя, клиент прислал 1 -> 10', '10', (select points::text from goals where id = g));
  insert into goals(user_id, name, points, difficulty) values (u, 'hard', 15000, 'hard') returning id into g;
  perform pg_temp.check_('03 создание, сложная, клиент прислал 15000 -> 15', '15', (select points::text from goals where id = g));
  insert into goals(user_id, name, points) values (u, 'none', 777) returning id into g;
  perform pg_temp.check_('04 создание, сложность не задана, клиент прислал 777 -> 5', '5', (select points::text from goals where id = g));
  insert into goals(user_id, name) values (u, 'defaults') returning id into g;
  perform pg_temp.check_('05 создание без points и без сложности -> 5', '5', (select points::text from goals where id = g));
  insert into goals(user_id, name, points, difficulty, stages) values (u, 'stages', 3, 'hard', 7) returning id into g;
  perform pg_temp.check_('06 число этапов баллы НЕ умножает (сложная, 7 этапов -> 15)', '15', (select points::text from goals where id = g));

  -- правка: баллы прежние, пока сложность не менялась
  update goals set points = 100000 where id = g;
  perform pg_temp.check_('07 правка: клиент пытается поднять баллы без смены сложности -> остаются 15', '15', (select points::text from goals where id = g));
  update goals set name = 'renamed', done = true, current_stage = 7, done_date = current_date where id = g;
  perform pg_temp.check_('08 правка названия/выполнения баллы не трогает', '15', (select points::text from goals where id = g));
  update goals set difficulty = 'easy', points = 1000 where id = g;
  perform pg_temp.check_('09 смена сложности hard -> easy, клиент прислал 1000 -> 5', '5', (select points::text from goals where id = g));
  update goals set difficulty = null where id = g;
  perform pg_temp.check_('10 сложность сняли (NULL) -> 5', '5', (select points::text from goals where id = g));
  update goals set difficulty = 'medium' where id = g;
  perform pg_temp.check_('11 сложность medium -> 10', '10', (select points::text from goals where id = g));

  -- старая цель с «чужими» баллами (создана до миграции — вставляем от имени администратора)
  perform pg_temp.as_admin();
  insert into goals(user_id, name, points, difficulty) values (u, 'legacy', 50, null) returning id into g;
  perform pg_temp.check_('12 администратор (auth.uid() NULL): баллы как заданы вручную, 50', '50', (select points::text from goals where id = g));
  perform pg_temp.as_client(u);
  update goals set done = true, done_date = current_date where id = g;
  perform pg_temp.check_('13 старая цель на 50: отметка выполнения баллы не трогает', '50', (select points::text from goals where id = g));
  update goals set name = 'legacy renamed', stages = 3, points = 5 where id = g;
  perform pg_temp.check_('14 старая цель на 50: правка без смены сложности и попытка занизить -> остаются 50', '50', (select points::text from goals where id = g));
  update goals set difficulty = 'hard' where id = g;
  perform pg_temp.check_('15 старая цель на 50: сменили сложность на hard -> по шкале, 15', '15', (select points::text from goals where id = g));

  -- администратор может править баллы вручную
  perform pg_temp.as_admin();
  update goals set points = 42 where id = g;
  perform pg_temp.check_('16 администратор правит баллы вручную -> 42', '42', (select points::text from goals where id = g));
end $$;

select n || ' | ' || name || ' | ожидалось ' || expected || ', получено ' || got || ' | ' || case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end from res order by n;
