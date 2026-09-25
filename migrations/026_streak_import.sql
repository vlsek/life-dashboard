-- 026_streak_import.sql
--
-- Import an existing streak into a metric — for something you were already tracking yourself
-- before this app (e.g. "128 days without smoking"). Two nullable columns on metrics:
--   streak_import_days  — how many days the streak already was, as of streak_import_date
--   streak_import_date  — the date that count was true on (defaults to "today" in the app)
-- The app adds streak_import_days on top of the streak it computes from daily_values, but only
-- while the computed streak still reaches back to streak_import_date with no gap — once the
-- computed streak's start moves past that date (a day was missed), the import no longer applies,
-- since the imported count and the tracked one would no longer be continuous.

alter table metrics add column if not exists streak_import_days int;
alter table metrics add column if not exists streak_import_date date;
