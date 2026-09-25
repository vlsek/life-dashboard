-- 027_exercise_duration.sql
--
-- Average speed/pace for distance- or volume-tracked exercises (running, cycling, swimming
-- distance, etc): an exercise can opt in to also logging a duration per set, in minutes.
-- With value_label set to "km" and tracks_duration on, a set becomes "5.2 km in 28 min",
-- and the app shows the pace (value per hour) next to it — computed on the fly, not stored.
-- Weight-tracked exercises can turn this on too (e.g. timed sets), it's independent of tracks_weight.

alter table workout_exercises add column if not exists tracks_duration boolean default false;
