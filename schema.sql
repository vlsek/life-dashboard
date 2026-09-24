-- =====================================================================================
-- ⚠️⚠️⚠️ ВНИМАНИЕ ⚠️⚠️⚠️
-- Этот файл — для ПЕРВОЙ установки на чистый проект Supabase.
-- Он УДАЛЯЕТ все таблицы перед созданием (см. drop table ниже) — если у тебя или
-- у других людей уже есть аккаунты и заполненные данные, повторный запуск этого
-- файла УНИЧТОЖИТ ВСЁ.
--
-- Для любых последующих изменений схемы используй файлы из папки migrations/ —
-- они устроены безопасно (ничего не удаляют, только добавляют) и их можно гонять
-- на "живой" базе с реальными пользователями без риска.
-- =====================================================================================

-- Выполни в Supabase: SQL Editor -> New query -> вставь всё -> Run
-- ВАЖНО: это НОВАЯ схема поверх реальных аккаунтов (Supabase Auth).

-- Если в этом проекте уже стояли таблицы с прошлой версии (текстовый user_id,
-- "просто имя") — удаляем их начисто, чтобы не было конфликта типов (uuid vs text).
-- ⚠️ Это стирает все данные, накопленные под старой схемой в ЭТОМ проекте Supabase.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists seed_default_metrics();
drop table if exists shop_items cascade;
drop table if exists skills cascade;
drop table if exists goals cascade;
drop table if exists daily_notes cascade;
drop table if exists body_stats cascade;
drop table if exists daily_values cascade;
drop table if exists metrics cascade;
drop table if exists profiles cascade;

-- ===== Профиль (доп. данные помимо самого аккаунта) =====
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birthdate date,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- ===== Настраиваемые метрики дня (отжимания/вода/учёба и т.д. — теперь редактируемые) =====
create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,                      -- "Отжимания"
  icon text default '📌',                  -- эмодзи-иконка
  type text not null default 'number',     -- 'number' | 'boolean' | 'multiselect'
  goal_value numeric,                      -- цель (для number)
  goal_direction text default 'at_least',  -- 'at_least' (>=) | 'at_most' (<, как калории)
  unit text default '',                    -- "мин", "л" и т.д.
  options jsonb default '[]',              -- для multiselect: [{"key":"gym","label":"🏋️ Зал"}, ...]
  position int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- ===== Значения метрик по дням =====
create table if not exists daily_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  metric_id uuid not null references metrics(id) on delete cascade,
  value jsonb,                             -- число / true-false / массив строк — зависит от типа метрики
  unique (user_id, date, metric_id)
);

-- ===== Показатели тела (вес, умные весы) — отдельно от метрик, не влияют на баллы =====
create table if not exists body_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight numeric,
  body_fat numeric,
  muscle_mass numeric,
  water_pct numeric,
  unique (user_id, date)
);

-- ===== Заметки дня + запланированные на день цели =====
create table if not exists daily_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  notes text,
  planned_goals jsonb default '[]'::jsonb,
  primary key (user_id, date)
);

-- ===== Долгосрочные цели =====
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text default 'Без категории',
  points int default 5,
  stages int default 1,
  current_stage int default 0,
  done boolean default false,
  done_date date,
  deadline date,       -- миграция 020: необязательный срок выполнения
  difficulty text check (difficulty is null or difficulty in ('easy', 'medium', 'hard')),
  created_at timestamptz default now()
);

-- ===== Навыки =====
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  progress int default 0,
  mastered boolean default false,
  created_at timestamptz default now()
);

-- ===== Магазин за баллы =====
create table if not exists shop_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  link text,
  cost int default 100,
  redeemed boolean default false,
  redeemed_date date,
  created_at timestamptz default now()
);

-- ===== RLS: теперь по-настоящему, доступ только владельцу аккаунта =====
alter table profiles enable row level security;
alter table metrics enable row level security;
alter table daily_values enable row level security;
alter table body_stats enable row level security;
alter table daily_notes enable row level security;
alter table goals enable row level security;
alter table skills enable row level security;
alter table shop_items enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own metrics" on metrics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own daily_values" on daily_values for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own body_stats" on body_stats for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own daily_notes" on daily_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goals" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own skills" on skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shop_items" on shop_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Стандартные 6 метрик теперь создаются не триггером в базе (это оказалось хрупко —
-- ронять весь signup при малейшей ошибке в триггере), а кодом дашборда при первом заходе
-- нового пользователя. Смотри dashboard.js -> seedDefaultMetricsIfEmpty().

-- =====================================================================================
-- ЛИДЕРБОРД И ЛЕНТА "ЧТО СДЕЛАЛ СЕГОДНЯ" — публичные для всех зарегистрированных
-- =====================================================================================
-- Это единственные места, где данные видны не только владельцу. Раскрываются только:
-- имя (display_name, не email), сумма баллов и текстовая заметка "что полезного сделал
-- сегодня" — если пользователь сам её написал. Точные цифры по метрикам (сколько воды,
-- калорий и т.д.) НЕ раскрываются никому, кроме самого владельца.

create or replace function calc_user_points(target_user uuid)
returns int as $$
declare
  daily_pts int := 0;
  goal_pts int := 0;
begin
  select coalesce(sum(
    case
      when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
      when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
      when m.type = 'number' and m.goal_direction = 'at_most'
        then ((dv.value)::numeric > 0 and (dv.value)::numeric < coalesce(m.goal_value,0))::int
      when m.type = 'number'
        then ((dv.value)::numeric >= coalesce(m.goal_value,0))::int
      else 0
    end
  ), 0) into daily_pts
  from daily_values dv
  join metrics m on m.id = dv.metric_id
  where dv.user_id = target_user and m.active = true;

  select coalesce(sum(points), 0) into goal_pts
  from goals where user_id = target_user and done = true;

  return daily_pts + goal_pts;
end;
$$ language plpgsql security definer;

create or replace function calc_user_points_for_date(target_user uuid, target_date date)
returns int as $$
declare
  pts int := 0;
begin
  select coalesce(sum(
    case
      when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
      when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
      when m.type = 'number' and m.goal_direction = 'at_most'
        then ((dv.value)::numeric > 0 and (dv.value)::numeric < coalesce(m.goal_value,0))::int
      when m.type = 'number'
        then ((dv.value)::numeric >= coalesce(m.goal_value,0))::int
      else 0
    end
  ), 0) into pts
  from daily_values dv
  join metrics m on m.id = dv.metric_id
  where dv.user_id = target_user and m.active = true and dv.date = target_date;
  return pts;
end;
$$ language plpgsql security definer;

create or replace function get_leaderboard()
returns table (user_id uuid, display_name text, avatar_url text, total_points int) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url, calc_user_points(p.user_id)
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;

create or replace function get_today_activity()
returns table (user_id uuid, display_name text, avatar_url text, today_points int, notes text) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url,
         calc_user_points_for_date(p.user_id, current_date),
         dn.notes
  from profiles p
  left join daily_notes dn on dn.user_id = p.user_id and dn.date = current_date
  order by 4 desc;
end;
$$ language plpgsql security definer;

grant execute on function calc_user_points(uuid) to authenticated;
grant execute on function calc_user_points_for_date(uuid, date) to authenticated;
grant execute on function get_leaderboard() to authenticated;
grant execute on function get_today_activity() to authenticated;

-- =====================================================================================
-- ХРАНИЛИЩЕ ДЛЯ АВАТАРОК
-- =====================================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars are publicly accessible" on storage.objects;
drop policy if exists "users upload own avatar" on storage.objects;
drop policy if exists "users update own avatar" on storage.objects;
drop policy if exists "users delete own avatar" on storage.objects;

create policy "avatars are publicly accessible" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "users upload own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own avatar" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================================
-- ПЕРЕНОС СТАРЫХ ДАННЫХ (если пользовался предыдущей версией с текстовым user_id)
-- =====================================================================================
-- Это НЕ выполняется автоматически. Если есть данные под старой схемой и хочется их
-- сохранить — напиши, сделаем скрипт переноса под конкретный случай (нужен будет твой
-- новый auth UUID и старое имя пользователя). Для пары недель данных обычно проще и
-- быстрее просто внести их заново вручную.
