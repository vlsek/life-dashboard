-- Сценарий для run.sh 112: ОГРАНИЧЕНИЯ skills.category (длина 40/41, пробелы, NULL, правка) — дополняет scenario_112_skill_category.sql (там RLS). Строки OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;
create or replace function pg_temp.try_(p_sql text) returns text as $$
begin execute p_sql; return ''; exception when others then return sqlstate; end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); sid uuid;
begin
  insert into auth.users(id) values (a);
  -- старый навык (до 112): category NULL
  insert into skills(user_id, name) values (a, 'Старый') returning id into sid;
  perform pg_temp.check_('01 у существующего навыка category NULL', 'null', coalesce((select category from skills where id = sid), 'null'));
  -- допустимые значения
  perform pg_temp.check_('02 обычная категория', '', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'Гитара', 'Музыка')$q$, a)));
  perform pg_temp.check_('03 категория с пробелом внутри', '', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'Штанга', 'Тяжёлая атлетика')$q$, a)));
  perform pg_temp.check_('04 ровно 40 символов', '', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'Длинная', repeat('я', 40))$q$, a)));
  perform pg_temp.check_('05 NULL = «Без категории»', '', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'Без', null)$q$, a)));
  -- недопустимые
  perform pg_temp.check_('06 41 символ отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'X', repeat('я', 41))$q$, a)));
  perform pg_temp.check_('07 пустая строка отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'X', '')$q$, a)));
  perform pg_temp.check_('08 пробелы по краям отклоняются (23514)', '23514', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'X', ' Музыка ')$q$, a)));
  perform pg_temp.check_('09 только пробелы отклоняются (23514)', '23514', pg_temp.try_(format($q$insert into skills(user_id, name, category) values (%L, 'X', '   ')$q$, a)));
  -- правка: поставить и снять категорию
  update skills set category = 'Языки' where id = sid;
  perform pg_temp.check_('10 update category', 'Языки', (select category from skills where id = sid));
  update skills set category = null where id = sid;
  perform pg_temp.check_('11 сброс в NULL', 'null', coalesce((select category from skills where id = sid), 'null'));
  perform pg_temp.check_('12 одно ограничение skills_category_check', '1', (select count(*)::text from pg_constraint where conname = 'skills_category_check' and conrelid = 'skills'::regclass));
  perform pg_temp.check_('13 колонка одна', '1', (select count(*)::text from information_schema.columns where table_name = 'skills' and column_name = 'category'));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || coalesce(got, 'NULL') end from res order by n;
