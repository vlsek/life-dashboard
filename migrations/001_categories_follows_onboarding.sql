-- migrations/001_categories_follows_onboarding.sql
--
-- БЕЗОПАСНО для базы с реальными пользователями: ничего не удаляет и не перезаписывает
-- существующие данные — только добавляет новые таблицы/колонки/функции.
-- Выполняется точно так же: SQL Editor -> New query -> вставить -> Run.

-- ===== Канонические категории активностей (для сравнения между разными людьми) =====
-- У каждого свои метрики со своими названиями — категория нужна, чтобы сравнивать
-- "отжимания у меня" с "отжиманиями у друга", даже если метрики называются по-разному.
create table if not exists metric_categories (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label_en text not null,
  label_ru text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

insert into metric_categories (key, label_en, label_ru) values
  ('pushups', 'Push-ups', 'Отжимания'),
  ('water', 'Water intake', 'Вода'),
  ('workout', 'Workout', 'Тренировка'),
  ('study', 'Study / Learning', 'Учёба'),
  ('reading', 'Reading', 'Чтение'),
  ('steps', 'Steps / Walking', 'Шаги / ходьба'),
  ('sleep', 'Sleep', 'Сон'),
  ('meditation', 'Meditation', 'Медитация'),
  ('no_junk_food', 'No junk food', 'Без вредной еды'),
  ('screen_time', 'Screen time limit', 'Лимит экранного времени'),
  ('protein', 'Protein intake', 'Белок'),
  ('no_alcohol', 'No alcohol', 'Без алкоголя')
on conflict (key) do nothing;

alter table metric_categories enable row level security;
drop policy if exists "anyone can read categories" on metric_categories;
drop policy if exists "authenticated can add categories" on metric_categories;
create policy "anyone can read categories" on metric_categories for select using (true);
create policy "authenticated can add categories" on metric_categories for insert with check (auth.uid() is not null);

-- ===== Метрика может быть привязана к категории (необязательно) =====
alter table metrics add column if not exists category_id uuid references metric_categories(id);

-- ===== Подписки на друзей (однонаправленно, как в Strava — не нужно взаимное согласие) =====
create table if not exists follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followed_id)
);
alter table follows enable row level security;
drop policy if exists "manage own follows" on follows;
drop policy if exists "see who follows you" on follows;
create policy "manage own follows" on follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "see who follows you" on follows for select using (auth.uid() = followed_id);

-- Найти пользователя по email, чтобы подписаться (auth.users напрямую не читается с клиента)
create or replace function find_user_by_email(lookup_email text)
returns uuid language sql security definer as $$
  select id from auth.users where email = lookup_email limit 1;
$$;
grant execute on function find_user_by_email(text) to authenticated;

-- Лидерборд по конкретной категории (для сравнения "у кого больше баллов по отжиманиям")
create or replace function get_category_leaderboard(cat_key text)
returns table(user_id uuid, display_name text, avatar_url text, category_points int) as $$
begin
  return query
  select p.user_id, coalesce(p.display_name, 'Без имени'), p.avatar_url,
    coalesce((
      select sum(
        case
          when m.type = 'boolean' then (dv.value = 'true'::jsonb)::int
          when m.type = 'multiselect' then (jsonb_array_length(dv.value) > 0)::int
          when m.type = 'number' and m.goal_direction = 'at_most'
            then ((dv.value)::numeric > 0 and (dv.value)::numeric < coalesce(m.goal_value,0))::int
          when m.type = 'number'
            then ((dv.value)::numeric >= coalesce(m.goal_value,0))::int
          else 0
        end
      )
      from daily_values dv
      join metrics m on m.id = dv.metric_id
        and m.category_id = (select id from metric_categories where key = cat_key)
      where dv.user_id = p.user_id and m.active = true
    ), 0) as category_points
  from profiles p
  order by 4 desc;
end;
$$ language plpgsql security definer;
grant execute on function get_category_leaderboard(text) to authenticated;

-- ===== Поля анкеты при регистрации =====
alter table profiles add column if not exists gender text;              -- 'male' | 'female'
alter table profiles add column if not exists height numeric;            -- см
alter table profiles add column if not exists goal_type text;            -- 'lose_weight' | 'gain_muscle' | 'learn_skill' | 'general_fitness'
alter table profiles add column if not exists onboarded boolean default false;
