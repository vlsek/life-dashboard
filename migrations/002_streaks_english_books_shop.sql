-- migrations/002_streaks_english_books_shop.sql
--
-- БЕЗОПАСНО для базы с реальными пользователями: ничего не удаляет и не перезаписывает
-- существующие данные — только добавляет новые таблицы/колонки/функции.
-- Выполняется так же: SQL Editor -> New query -> вставить -> Run.

-- ===== Английский: словарь новых слов =====
create table if not exists vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  translation text,
  example text,
  learned boolean default false,
  created_at timestamptz default now()
);
alter table vocabulary enable row level security;
drop policy if exists "own vocabulary" on vocabulary;
create policy "own vocabulary" on vocabulary for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Книги (раздел внутри Навыков) =====
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  points int default 10,
  status text default 'to_read', -- to_read | reading | done
  done_date date,
  created_at timestamptz default now()
);
alter table books enable row level security;
drop policy if exists "own books" on books;
create policy "own books" on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Навыки: настраиваемый шаг прогресса + баллы за освоение =====
alter table skills add column if not exists step int default 10;
alter table skills add column if not exists points int default 10;

-- ===== Магазин: картинка товара (по ссылке или загруженная) =====
alter table shop_items add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do nothing;

drop policy if exists "shop images are publicly accessible" on storage.objects;
drop policy if exists "users upload own shop images" on storage.objects;
drop policy if exists "users update own shop images" on storage.objects;
drop policy if exists "users delete own shop images" on storage.objects;

create policy "shop images are publicly accessible" on storage.objects
  for select using (bucket_id = 'shop-images');
create policy "users upload own shop images" on storage.objects
  for insert with check (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own shop images" on storage.objects
  for update using (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own shop images" on storage.objects
  for delete using (bucket_id = 'shop-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Пересчёт общих баллов: теперь учитывает и освоенные навыки, и прочитанные книги =====
create or replace function calc_user_points(target_user uuid)
returns int as $$
declare
  daily_pts int := 0;
  goal_pts int := 0;
  skill_pts int := 0;
  book_pts int := 0;
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

  select coalesce(sum(points), 0) into goal_pts from goals where user_id = target_user and done = true;
  select coalesce(sum(points), 0) into skill_pts from skills where user_id = target_user and mastered = true;
  select coalesce(sum(points), 0) into book_pts from books where user_id = target_user and status = 'done';

  return daily_pts + goal_pts + skill_pts + book_pts;
end;
$$ language plpgsql security definer;

grant execute on function calc_user_points(uuid) to authenticated;
