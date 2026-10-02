-- 036_water_log.sql
-- Журнал воды: каждое добавление стакана / правка суммы за день с точным временем (BACKLOG 2.2 «Время приема воды», агент 7).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Что хранится: ОДНА строка на одно изменение суммы воды за день. Сама сумма дня по-прежнему лежит в daily_values
-- (источник правды для баллов, серий и колец) — журнал её НЕ заменяет, а только описывает «из чего она сложилась»:
--   date           — день, за который записана вода (как daily_values.date; может быть прошлым — вода задним числом);
--   drank_at       — когда выпито: сейчас, либо время, выбранное в окне воды; для прошлого дня без выбора — 12:00 по часам устройства;
--   delta_ml       — на сколько изменилась сумма дня: +250 (стакан), отрицательное — правка суммы «вниз»; 0 не бывает;
--   total_after_ml — сумма за день ПОСЛЕ этой записи (для сверки с daily_values и истории);
--   kind           — 'add' (кнопки +200 мл / +1 л / своя сумма) или 'edit' (правка всей суммы за день карандашиком).
-- «Отменить последнее добавление» удаляет соответствующую строку журнала (и откатывает сумму в daily_values).
--
-- Права: как у остальных личных таблиц — читать/писать/удалять только свои строки (RLS по user_id).
-- Без этой миграции окно воды работает как раньше, а журнал «Записи за день» показывает только записи этого устройства
-- (localStorage), без синхронизации между устройствами и без времени, выбранного вручную, — ничего не ломается.

create table if not exists water_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  drank_at timestamptz not null default now(),
  delta_ml integer not null,
  total_after_ml integer,
  kind text not null default 'add',
  created_at timestamptz not null default now(),
  constraint water_log_delta_nonzero check (delta_ml <> 0),
  constraint water_log_kind_check check (kind in ('add', 'edit'))
);

-- Выборка «записи пользователя за день по времени» и будущая статистика по времени суток.
create index if not exists water_log_user_date_idx on water_log(user_id, date, drank_at);

alter table water_log enable row level security;

drop policy if exists "own water_log" on water_log;
create policy "own water_log" on water_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
