-- 031_metric_count_streak.sql
--
-- Per-metric switch "count a streak for this metric" (BACKLOG 14, 11:15). Some metrics are just a value
-- you record (weight, measurements) — nobody wants a streak for "weighed in every day".
--   count_streak boolean — true (default): the metric takes part in streaks as before;
--                          false: no per-metric streak, and it is not required for the "perfect day" streak.
-- In the metric form the "just record a value" switch saves count_streak = false together with a neutral goal
-- (0, at_least), no schedule and no streak import. The app works without this column (the switch just can't
-- be saved until the migration is applied).

alter table metrics add column if not exists count_streak boolean not null default true;
