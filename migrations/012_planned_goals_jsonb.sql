-- 012_planned_goals_jsonb.sql
--
-- БАГ: daily_notes.planned_goals была объявлена как text[] (массив строк), а код
-- с самого начала кладёт туда объекты {type, text, done}. Supabase на лету
-- превращал каждый объект в JSON-строку, чтобы впихнуть в текстовый массив.
-- При следующей загрузке код видел строку вместо объекта и заново заворачивал её
-- как новый пункт при сохранении — отсюда двойное/тройное JSON-экранирование
-- и "цель удалена" на ровном месте. Баг был общий для "Целей на сегодня"
-- на дашборде и для календаря — они пишут в один и тот же столбец.
--
-- ИСКЛЮЧЕНИЕ из правила "только additive": здесь физически нужно поменять тип
-- колонки, поэтому есть DROP COLUMN — но только для этой одной колонки, и только
-- после того как все данные скопированы и репарированы во временную колонку.
--
-- Что делает эта миграция:
-- 1) заводит временную jsonb-колонку planned_goals_new
-- 2) построчно проходит все daily_notes и репарирует каждый элемент массива:
--    - если элемент — уже валидный JSON-объект (после экранирования) — берёт его
--    - если внутри него ещё раз JSON-строка (двойное/тройное экранирование) —
--      разворачивает её слоями, пока не получит объект
--    - если это просто голая строка (совсем старый формат, до типов) — оборачивает
--      как {"type":"goal","text": <строка>}
-- 3) удаляет старую колонку и переименовывает новую на её место

alter table daily_notes add column if not exists planned_goals_new jsonb default '[]'::jsonb;

do $$
declare
  r record;
  item text;
  parsed jsonb;
  result jsonb;
  guard int;
begin
  for r in select user_id, date, planned_goals from daily_notes where planned_goals is not null loop
    result := '[]'::jsonb;
    if r.planned_goals is not null then
      foreach item in array r.planned_goals loop
        begin
          parsed := item::jsonb;
        exception when others then
          parsed := jsonb_build_object('type', 'goal', 'text', item);
        end;

        -- разворачиваем вложенное JSON-экранирование, если оно есть (защита от зацикливания через guard)
        guard := 0;
        while jsonb_typeof(parsed) = 'string' and guard < 5 loop
          begin
            parsed := (parsed #>> '{}')::jsonb;
          exception when others then
            parsed := jsonb_build_object('type', 'custom', 'text', parsed #>> '{}', 'done', false);
          end;
          guard := guard + 1;
        end loop;

        if jsonb_typeof(parsed) <> 'object' then
          parsed := jsonb_build_object('type', 'custom', 'text', coalesce(parsed #>> '{}', ''), 'done', false);
        end if;

        result := result || jsonb_build_array(parsed);
      end loop;
    end if;
    update daily_notes set planned_goals_new = result where user_id = r.user_id and date = r.date;
  end loop;
end $$;

alter table daily_notes drop column planned_goals;
alter table daily_notes rename column planned_goals_new to planned_goals;
