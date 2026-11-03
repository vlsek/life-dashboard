-- Сценарий для run.sh 115: таблица plan_templates (шаблоны дня). Строки OK / РАСХОЖДЕНИЕ. Только тестовая БД стенда.
\set ON_ERROR_STOP 1
\pset format unaligned
\pset tuples_only on
create temp table res(n serial, name text, expected text, got text);
create or replace function pg_temp.check_(p_name text, p_expected text, p_got text) returns void as $$
begin insert into res(name, expected, got) values (p_name, p_expected, p_got); end $$ language plpgsql;
create or replace function pg_temp.try_(p_sql text) returns text as $$
begin execute p_sql; return ''; exception when others then return sqlstate; end $$ language plpgsql;

do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); n int; i int;
begin
  insert into auth.users(id) values (a), (b);
  perform pg_temp.check_('01 корректный шаблон с временем и бонусом', '', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Рабочий день', '[{"text":"Планёрка","time":"09:30"},{"text":"Прогулка","bonus":true},{"text":"Отчёт"}]')$q$, a)));
  perform pg_temp.check_('02 time = null допустим', '', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Выходной', '[{"text":"Йога","time":null}]')$q$, a)));
  perform pg_temp.check_('03 пустое название отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, '   ', '[{"text":"X"}]')$q$, a)));
  perform pg_temp.check_('04 название длиннее 40 отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, repeat('я', 41), '[{"text":"X"}]')$q$, a)));
  perform pg_temp.check_('05 пустой массив пунктов отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Пустой', '[]')$q$, a)));
  perform pg_temp.check_('06 items не массив отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Объект', '{"text":"X"}')$q$, a)));
  perform pg_temp.check_('07 31 пункт отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Много', %L::jsonb)$q$, a, (select jsonb_agg(jsonb_build_object('text', 'п' || g)) from generate_series(1, 31) g)::text)));
  perform pg_temp.check_('08 ровно 30 пунктов допустимо', '', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Тридцать', %L::jsonb)$q$, a, (select jsonb_agg(jsonb_build_object('text', 'п' || g)) from generate_series(1, 30) g)::text)));
  perform pg_temp.check_('09 пункт без text отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Без текста', '[{"time":"10:00"}]')$q$, a)));
  perform pg_temp.check_('10 пустой text отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Пустой текст', '[{"text":"  "}]')$q$, a)));
  perform pg_temp.check_('11 text длиннее 120 отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Длинный', jsonb_build_array(jsonb_build_object('text', repeat('я', 121))))$q$, a)));
  perform pg_temp.check_('12 время 25:00 отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Время', '[{"text":"X","time":"25:00"}]')$q$, a)));
  perform pg_temp.check_('13 bonus не boolean отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Бонус', '[{"text":"X","bonus":"да"}]')$q$, a)));
  perform pg_temp.check_('14 пункт не объект отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Строка', '["X"]')$q$, a)));
  perform pg_temp.check_('15 то же название без учёта регистра и пробелов отклоняется (23505)', '23505', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, '  РАБОЧИЙ день ', '[{"text":"X"}]')$q$, a)));
  perform pg_temp.check_('16 то же название у другого пользователя допустимо', '', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Рабочий день', '[{"text":"X"}]')$q$, b)));
  select count(*) into n from plan_templates where user_id = a;
  perform pg_temp.check_('17 у пользователя три корректных шаблона', '3', n::text);
  -- лимит 20 шаблонов на пользователя
  for i in n + 1 .. 20 loop
    insert into plan_templates(user_id, name, items) values (a, 'Шаблон ' || i, '[{"text":"X"}]');
  end loop;
  perform pg_temp.check_('18 21-й шаблон отклоняется (23514)', '23514', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Лишний', '[{"text":"X"}]')$q$, a)));
  perform pg_temp.check_('19 лимит одного не мешает другому пользователю', '', pg_temp.try_(format($q$insert into plan_templates(user_id, name, items) values (%L, 'Второй', '[{"text":"X"}]')$q$, b)));
  -- RLS включён и политика одна
  perform pg_temp.check_('20 RLS включён', 'true', (select relrowsecurity::text from pg_class where relname = 'plan_templates'));
  perform pg_temp.check_('21 одна политика own plan_templates', '1', (select count(*)::text from pg_policies where tablename = 'plan_templates' and policyname = 'own plan_templates'));
  -- повторное применение миграции безопасно (идемпотентность проверяет run.sh на чистой БД; здесь — функция и триггер на месте)
  perform pg_temp.check_('22 триггер лимита на месте', '1', (select count(*)::text from pg_trigger where tgname = 'plan_templates_limit_trg' and not tgisinternal));
  -- удаление пользователя каскадно чистит строки
  delete from auth.users where id = a;
  perform pg_temp.check_('23 каскад по удалению пользователя', '0', (select count(*)::text from plan_templates where user_id = a));
end $$;

select case when expected = got then 'OK' else 'РАСХОЖДЕНИЕ' end || ' ' || name || case when expected = got then '' else ' | ожидалось: ' || expected || ' | получено: ' || got end from res order by n;
