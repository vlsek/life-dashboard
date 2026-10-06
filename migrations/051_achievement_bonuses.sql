-- 051_achievement_bonuses.sql
-- БОНУСНЫЕ МОНЕТЫ за достижения (BACKLOG раздел 37 «Достижения побуждают пользоваться всеми разделами»; схема наград подтверждена владельцем 2026-10-05:
-- ступени 1–2 лесенки — монетки, 3 — предмет Кастомизации, 4 — тема). Это шаг (1) порядка работ — хранение бонуса и учёт в балансе.
-- ПРИМЕНЯТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен). Номер: 050 занят агентом 4 («категории целей»).
--
-- ЧТО ХРАНИТСЯ. achievement_bonuses — одна строка на ВЫДАННЫЙ бонус: ключ значка (`key`, как в user_achievements: words_50, goals_25 …),
-- сколько монет (`coins`, 0,1…500) и когда выдан. Первичный ключ (user_id, key) = «один раз на значок»: повторная выдача невозможна ни при каком сбое
-- или гонке (две вкладки, повторный reconcile) — вторая вставка отклоняется базой.
-- ЧТО ЭТО ДАЁТ. Баланс = накоплено баллов + бонусные монеты − потрачено (Магазин, Кастомизация, Дашборд — клиентский расчёт, см. ROADMAP v3.21).
-- Бонус НЕ входит в «накоплено баллов» и в таблицу лидеров: функции calc_user_points / get_leaderboard* / get_category_leaderboard (044/045/046) НЕ менялись —
-- иначе награда сама открывала бы следующий значок «100/500/1000 баллов» и поднимала бы в рейтинге.
-- ПРАВА. Читать и добавлять — только свои строки (RLS по user_id). Менять и удалять нельзя никому, кроме администратора БД: выданное не отнять и не
-- «перевыдать» (политик update/delete нет, привилегии отозваны). Размер награды клиент присылает сам (реестр наград — web-achievements/src/lib/rewards.ts); защита —
-- потолок 500 на строку и «один раз на ключ». Для личного приложения достаточно; серверная сверка с условием значка — отдельная большая задача.
--
-- КАК ВЫДАВАТЬ (контракт для клиента, агент 6): запись идемпотентна и безопасна при повторах и гонках —
--   await sb.from('achievement_bonuses').upsert({ user_id, key, coins }, { onConflict: 'user_id,key', ignoreDuplicates: true })
-- (ON CONFLICT DO NOTHING: уже выданное молча пропускается). «Задним числом» — вызвать то же для всех уже открытых значков с наградой-монетами.
-- Читать баланс-бонус: sb.from('achievement_bonuses').select('key, coins, granted_at').eq('user_id', userId).
-- Без миграции приложение работает как раньше: запрос к таблице вернёт ошибку «нет таблицы», и клиенты считают бонус нулевым.
-- Откат: drop table achievement_bonuses;
-- Проверка после применения — docs/sql-checks/051_achievement_bonuses_check.sql.

create table if not exists achievement_bonuses (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null check (char_length(key) between 1 and 80),
  coins numeric(10, 1) not null check (coins >= 0.1 and coins <= 500),
  granted_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table achievement_bonuses enable row level security;

drop policy if exists "read own achievement_bonuses" on achievement_bonuses;
create policy "read own achievement_bonuses" on achievement_bonuses
  for select using (auth.uid() = user_id);

drop policy if exists "grant own achievement_bonuses" on achievement_bonuses;
create policy "grant own achievement_bonuses" on achievement_bonuses
  for insert with check (auth.uid() = user_id);

-- Только чтение и добавление: update/delete закрыты и политиками (их нет), и привилегиями.
revoke all on achievement_bonuses from anon, authenticated;
grant select, insert on achievement_bonuses to authenticated;
