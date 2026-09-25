-- 028_exercise_bilateral.sql
--
-- Left/right (bilateral) tracking for exercises done one side at a time — single-arm curls,
-- single-leg press, unilateral rehab work, etc. A set's side ('L' | 'R' | null) lives in the
-- existing sets jsonb (no column needed for that); this migration only adds the per-exercise
-- opt-in flag that turns the Left/Right picker on in the set-entry form.

alter table workout_exercises add column if not exists bilateral boolean default false;
