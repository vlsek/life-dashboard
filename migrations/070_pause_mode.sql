-- 070: режим «отпуск / болезнь» — серии и недельный прогресс на паузе (BACKLOG 48.7, агент 1).
-- Решения владельца (2026-10-11 07:17): задним числом включать НЕЛЬЗЯ (пауза начинается сегодня или позже); не дольше 30 дней;
-- пауза замораживает и серии, и недельный прогресс. Дни паузы не рвут серию и не увеличивают её, как и дни вне расписания.
--
-- КАК УСТРОЕНО. Серверные расчёты серий (`calc_perfect_streak`, `calc_category_streak`, редакция 061) и все клиенты уже умеют «пропущенный день
-- метрики» — `metrics.skipped_days` (47.3). Пауза использует ровно его: `start_pause` дописывает даты паузы в `skipped_days` ВСЕХ метрик пользователя,
-- `end_pause` убирает будущие даты, а новая метрика, созданная во время паузы, получает даты паузы триггером. Поэтому функции серий НЕ меняются, а клиенты
-- (Дашборд, шапка, «Достижения», «Календарь»…) подхватывают паузу без правок расчётов. Таблица `streak_pauses` — журнал пауз и источник «идёт ли пауза».
--  * Писать в `streak_pauses` напрямую нельзя (нет ни политик, ни привилегий) — только функции ниже; так серию нельзя «нарисовать» прямым запросом.
--  * Сторож `metrics_skipped_days_guard` (061) остаётся в силе для ручных пропусков: функции паузы открывают ему окно через `app.pause_write` на время одной транзакции.
--  * Одна пауза за раз (идущая или запланированная); прошедшая пауза остаётся в журнале, её даты в `skipped_days` — история и не снимаются.
--  * Баллы и значения не затрагиваются. Повторный запуск безопасен. Нужны: 061 (`skipped_days`, `user_today`).
-- Откат: drop function start_pause(text, date, date); drop function end_pause(); drop trigger metrics_pause_dates on metrics; drop function metrics_apply_pause();
--        drop table streak_pauses; затем вернуть сторожа из 061 (create or replace function metrics_skipped_days_guard — текст в 061).
-- Проверка после применения — docs/sql-checks/070_pause_mode_check.sql.

create table if not exists streak_pauses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('vacation', 'illness')),
  from_date date not null,
  to_date date not null,
  created_at timestamptz not null default now(),
  check (to_date >= from_date and to_date - from_date <= 29) -- не дольше 30 дней (включая оба конца)
);

create index if not exists streak_pauses_user_idx on streak_pauses (user_id, to_date desc);

alter table streak_pauses enable row level security;

drop policy if exists "read own streak_pauses" on streak_pauses;
create policy "read own streak_pauses" on streak_pauses
  for select using (auth.uid() = user_id);

-- Только чтение; запись — функции start_pause/end_pause (security definer).
revoke all on streak_pauses from anon, authenticated;
grant select on streak_pauses to authenticated;

-- ===== сторож пропусков (редакция 061) + окно для функций паузы =====
create or replace function metrics_skipped_days_guard()
returns trigger as $$
declare
  v_today date;
  v_from date;
  d date;
begin
  if coalesce(current_setting('app.pause_write', true), '') = '1' then
    return new; -- пишет функция паузы (start_pause/end_pause/триггер новой метрики), а не клиент
  end if;
  if tg_op = 'INSERT' then
    if coalesce(array_length(new.skipped_days, 1), 0) > 0 then
      raise exception 'skipped_days_not_empty_on_insert' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.skipped_days is not distinct from old.skipped_days then return new; end if;
  v_today := user_today(new.user_id);
  v_from := v_today - 1;
  -- добавленные даты — только вчера/сегодня
  for d in select x from unnest(coalesce(new.skipped_days, '{}'::date[])) x where not (x = any (coalesce(old.skipped_days, '{}'::date[]))) loop
    if d < v_from or d > v_today then
      raise exception 'skip_out_of_window' using errcode = 'P0001';
    end if;
  end loop;
  -- снятые даты — тоже только вчера/сегодня (старые пропуски — история, их не трогаем)
  for d in select x from unnest(coalesce(old.skipped_days, '{}'::date[])) x where not (x = any (coalesce(new.skipped_days, '{}'::date[]))) loop
    if d < v_from or d > v_today then
      raise exception 'skip_out_of_window' using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$ language plpgsql;

-- ===== дописать даты паузы метрикам пользователя (внутренняя) =====
create or replace function pause_add_dates(p_user uuid, p_from date, p_to date, p_metric uuid default null)
returns void as $$
begin
  perform set_config('app.pause_write', '1', true);
  update metrics m
     set skipped_days = (
       select coalesce(array_agg(distinct x order by x), '{}'::date[])
       from unnest(coalesce(m.skipped_days, '{}'::date[]) || array(select p_from + g from generate_series(0, p_to - p_from) g)) x
     )
   where m.user_id = p_user and (p_metric is null or m.id = p_metric);
  perform set_config('app.pause_write', '', true);
end;
$$ language plpgsql security definer;

revoke all on function pause_add_dates(uuid, date, date, uuid) from public, anon, authenticated;

-- ===== убрать даты паузы начиная с p_from (внутренняя) =====
create or replace function pause_remove_dates(p_user uuid, p_from date, p_to date)
returns void as $$
begin
  perform set_config('app.pause_write', '1', true);
  update metrics m
     set skipped_days = coalesce((select array_agg(x order by x) from unnest(coalesce(m.skipped_days, '{}'::date[])) x where not (x between p_from and p_to)), '{}'::date[])
   where m.user_id = p_user and m.skipped_days && array(select p_from + g from generate_series(0, p_to - p_from) g);
  perform set_config('app.pause_write', '', true);
end;
$$ language plpgsql security definer;

revoke all on function pause_remove_dates(uuid, date, date) from public, anon, authenticated;

-- ===== включить паузу =====
-- p_kind: 'vacation' | 'illness'; p_from — день начала (не раньше «сегодня» пользователя; по умолчанию сегодня); p_to — последний день паузы.
create or replace function start_pause(p_kind text, p_to date, p_from date default null)
returns streak_pauses as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_from date;
  v_row streak_pauses;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if p_kind not in ('vacation', 'illness') then raise exception 'bad_pause_kind' using errcode = 'P0001'; end if;
  v_today := user_today(v_uid);
  v_from := coalesce(p_from, v_today);
  if v_from < v_today then raise exception 'pause_backdated' using errcode = 'P0001'; end if;           -- задним числом нельзя
  if p_to is null or p_to < v_from then raise exception 'pause_bad_range' using errcode = 'P0001'; end if;
  if p_to - v_from > 29 then raise exception 'pause_too_long' using errcode = 'P0001'; end if;             -- не дольше 30 дней
  if v_from > v_today + 60 then raise exception 'pause_too_far' using errcode = 'P0001'; end if;           -- запланировать можно не дальше чем на 60 дней вперёд
  if exists (select 1 from streak_pauses where user_id = v_uid and to_date >= v_today) then
    raise exception 'pause_already_set' using errcode = 'P0001';                                           -- идущая или запланированная пауза уже есть
  end if;

  insert into streak_pauses (user_id, kind, from_date, to_date) values (v_uid, p_kind, v_from, p_to) returning * into v_row;
  perform pause_add_dates(v_uid, v_from, p_to);
  return v_row;
end;
$$ language plpgsql security definer;

revoke all on function start_pause(text, date, date) from public, anon;
grant execute on function start_pause(text, date, date) to authenticated;

-- ===== закончить паузу раньше срока =====
-- Идущая: последним днём паузы становится вчера (сегодняшний день уже считается как обычно); запланированная (ещё не началась) — удаляется.
create or replace function end_pause()
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_row streak_pauses;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  v_today := user_today(v_uid);
  select * into v_row from streak_pauses where user_id = v_uid and to_date >= v_today order by to_date desc limit 1;
  if not found then return; end if;

  perform pause_remove_dates(v_uid, greatest(v_row.from_date, v_today), v_row.to_date);
  if v_row.from_date >= v_today then
    delete from streak_pauses where id = v_row.id;
  else
    update streak_pauses set to_date = v_today - 1 where id = v_row.id;
  end if;
end;
$$ language plpgsql security definer;

revoke all on function end_pause() from public, anon;
grant execute on function end_pause() to authenticated;

-- ===== новая метрика во время паузы тоже на паузе =====
create or replace function metrics_apply_pause()
returns trigger as $$
declare
  v_today date;
  p streak_pauses;
begin
  v_today := user_today(new.user_id);
  select * into p from streak_pauses where user_id = new.user_id and to_date >= v_today order by to_date desc limit 1;
  if found then
    perform pause_add_dates(new.user_id, greatest(p.from_date, v_today), p.to_date, new.id);
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists metrics_pause_dates on metrics;
create trigger metrics_pause_dates after insert on metrics
  for each row execute function metrics_apply_pause();
