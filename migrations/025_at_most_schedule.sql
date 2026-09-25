-- 025_at_most_schedule.sql
--
-- New metric schedule type: {"type": "at_most", "max": N} — "no more than N times a week"
-- (opposite of {"type": "weekly", "min": N}). Like "weekly", it is not tied to a specific day
-- of the week, so it must be excluded from the leaderboard's "expected on this day" check the
-- same way — otherwise it would be treated as required every day. Requires migration 023.

create or replace function metric_expected_on(sched jsonb, d date)
returns boolean as $$
begin
  if sched is null or jsonb_typeof(sched) <> 'object' then return true; end if;

  if sched->>'type' = 'days'
     and jsonb_typeof(sched->'days') = 'array'
     and jsonb_array_length(sched->'days') between 1 and 6 then
    return exists (
      select 1 from jsonb_array_elements_text(sched->'days') x
      where x::int = extract(dow from d)::int
    );
  end if;

  if sched->>'type' = 'weekly' and coalesce((sched->>'min')::numeric, 0) >= 1 then
    return false; -- не привязана к конкретному дню
  end if;

  if sched->>'type' = 'at_most' and (sched->>'max') is not null then
    return false; -- тоже не привязана к конкретному дню
  end if;

  return true;
end;
$$ language plpgsql immutable;

grant execute on function metric_expected_on(jsonb, date) to authenticated;
