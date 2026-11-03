-- 115_plan_templates.sql
-- Шаблоны дня для «Планов» (BACKLOG 75.12 «Шаблоны дня и вечерний ритуал», срез 1, агент 6).
-- ПРИМЕНИТЬ В SUPABASE SQL EDITOR (одним запуском; повторный запуск безопасен).
--
-- Одна строка = один шаблон: пакет своих пунктов плана («Рабочий день», «Выходной»), который применяется к любому дню одним касанием.
--   name  — название шаблона (1–40 символов без лишних пробелов по краям; у пользователя названия не повторяются без учёта регистра);
--   items — массив пунктов (1–30), у каждого: text (1–120 символов), необязательные time «HH:MM» и bonus (true/false).
--           Пунктов-целей и отметок о выполнении в шаблоне нет: цели живут сами, а «выполнено» — свойство дня, а не шаблона.
-- Не больше 20 шаблонов на пользователя. Сам план дня по-прежнему лежит в daily_notes.planned_goals; таблица ничего в старых данных не меняет.
--
-- Права: как у остальных личных таблиц — читать/писать/удалять только свои строки (RLS по user_id).
-- Без этой миграции «Планы» работают как раньше (кнопки «Шаблоны» просто нет).
-- Откат: drop table plan_templates; drop function plan_template_items_ok(jsonb); drop function plan_templates_limit();

create or replace function plan_template_items_ok(p jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) between 1 and 30
     and not exists (
       select 1 from jsonb_array_elements(p) e
       where jsonb_typeof(e) <> 'object'
          or jsonb_typeof(e->'text') is distinct from 'string'
          or char_length(btrim(e->>'text')) not between 1 and 120
          or (e ? 'time' and e->'time' <> 'null'::jsonb and (jsonb_typeof(e->'time') <> 'string' or (e->>'time') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'))
          or (e ? 'bonus' and jsonb_typeof(e->'bonus') <> 'boolean')
     )
$$;

create table if not exists plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  items jsonb not null,
  created_at timestamptz not null default now(),
  constraint plan_templates_name_check check (char_length(btrim(name)) between 1 and 40),
  constraint plan_templates_items_check check (plan_template_items_ok(items))
);

create unique index if not exists plan_templates_user_name_uq on plan_templates(user_id, lower(btrim(name)));
create index if not exists plan_templates_user_idx on plan_templates(user_id, created_at);

create or replace function plan_templates_limit() returns trigger
language plpgsql as $$
begin
  if (select count(*) from plan_templates where user_id = new.user_id) >= 20 then
    raise exception 'plan_templates: не больше 20 шаблонов' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists plan_templates_limit_trg on plan_templates;
create trigger plan_templates_limit_trg before insert on plan_templates for each row execute function plan_templates_limit();

alter table plan_templates enable row level security;

drop policy if exists "own plan_templates" on plan_templates;
create policy "own plan_templates" on plan_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
