import { describe, expect, it } from 'vitest'
import {
  buildInsertCustom,
  buildUpdateFromForm,
  computeDailyStats,
  exerciseRepsByDate,
  exerciseSetsToReps,
  formFromChallenge,
  hasAutoSource,
  mergeMetricValues,
} from './challenges'
import type { Challenge, CustomChallengeFormInput } from './types'

const form = (over: Partial<CustomChallengeFormInput> = {}): CustomChallengeFormInput => ({
  title: 'Отжимания', icon: '💪', type: 'daily_fixed', duration: 30, dailyTarget: 50, startValue: 0, increment: 1, unit: 'раз', targetCount: 10, itemLabel: '', ...over,
})
const ch = (over: Partial<Challenge> = {}): Challenge => ({
  id: 'c1', user_id: 'u', template_id: null, title: 'T', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 30, daily_target: 50, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2026-09-01T00:00:00Z', ...over,
})

describe('exerciseSetsToReps', () => {
  it('sums reps over all sets; sets without reps (time-only) add nothing', () => {
    expect(exerciseSetsToReps([{ reps: 20, weight: 0 }, { reps: 15 }, { time: 60 }])).toBe(35)
  })
  it('old format (plain number) passes through; garbage is 0', () => {
    expect(exerciseSetsToReps(30)).toBe(30)
    expect(exerciseSetsToReps(null)).toBe(0)
    expect(exerciseSetsToReps('x')).toBe(0)
    expect(exerciseSetsToReps([])).toBe(0)
  })
})

describe('exerciseRepsByDate', () => {
  const rows = [
    { exercise_id: 'e1', date: '2026-09-01', sets: [{ reps: 20 }, { reps: 10 }] },
    { exercise_id: 'e1', date: '2026-09-01', sets: [{ reps: 5 }] }, // вторая запись за тот же день складывается
    { exercise_id: 'e1', date: '2026-09-02', sets: [{ time: 40 }] }, // нет повторов — дня нет
    { exercise_id: 'e2', date: '2026-09-01', sets: [{ reps: 99 }] }, // чужое упражнение
  ]
  it('sums reps per day for the chosen exercise only, skipping empty days', () => {
    expect(exerciseRepsByDate(rows, 'e1')).toEqual({ '2026-09-01': 35 })
    expect(exerciseRepsByDate(rows, 'e2')).toEqual({ '2026-09-01': 99 })
    expect(exerciseRepsByDate(rows, 'nope')).toEqual({})
  })
  it('feeds the daily stats through mergeMetricValues: workout days count toward the target, manual entry wins', () => {
    const byDate = exerciseRepsByDate([...rows, { exercise_id: 'e1', date: '2026-09-03', sets: [{ reps: 50 }] }], 'e1')
    const manual = [{ id: 'm', user_id: 'u', challenge_id: 'c1', date: '2026-09-03', value: 10, note: null, created_at: '' }]
    const merged = mergeMetricValues(ch(), manual, byDate)
    const stats = computeDailyStats(ch(), merged, '2026-09-04')
    expect(stats.doneDays[0].value).toBe(35)
    expect(stats.doneDays[2].value).toBe(10) // ручная запись главнее 50 из тренировок
    expect(stats.completedCount).toBe(0)
  })
})

describe('source: exercise in insert / update / form', () => {
  it('insert writes source_exercise_id only when chosen, and then not the metric', () => {
    expect(buildInsertCustom(form())).not.toHaveProperty('source_exercise_id')
    const ins = buildInsertCustom(form({ sourceExerciseId: 'e1', sourceMetricId: 'm1' }))
    expect(ins.source_exercise_id).toBe('e1')
    expect(ins).not.toHaveProperty('source_metric_id')
    expect(buildInsertCustom(form({ sourceMetricId: 'm1' })).source_metric_id).toBe('m1')
  })
  it('cumulative challenges never get a source', () => {
    expect(buildInsertCustom(form({ type: 'cumulative_count', sourceExerciseId: 'e1' }))).not.toHaveProperty('source_exercise_id')
  })
  it('update: switching metric -> exercise nulls the metric, but only if that column exists', () => {
    const withBoth = buildUpdateFromForm(form({ sourceExerciseId: 'e1' }), 'daily_fixed', ch({ source_metric_id: 'm1', source_exercise_id: null }))
    expect(withBoth.source_exercise_id).toBe('e1')
    expect(withBoth.source_metric_id).toBeNull()
    const noMetricCol = buildUpdateFromForm(form({ sourceExerciseId: 'e1' }), 'daily_fixed', ch({ source_exercise_id: null }))
    expect(noMetricCol).not.toHaveProperty('source_metric_id')
  })
  it('update: switching exercise -> metric nulls the exercise; back to manual nulls both', () => {
    const toMetric = buildUpdateFromForm(form({ sourceMetricId: 'm1' }), 'daily_fixed', ch({ source_metric_id: null, source_exercise_id: 'e1' }))
    expect(toMetric.source_metric_id).toBe('m1')
    expect(toMetric.source_exercise_id).toBeNull()
    const manual = buildUpdateFromForm(form(), 'daily_fixed', ch({ source_metric_id: null, source_exercise_id: 'e1' }))
    expect(manual.source_metric_id).toBeNull()
    expect(manual.source_exercise_id).toBeNull()
  })
  it('update on a database without migration 042 never mentions source_exercise_id', () => {
    const patch = buildUpdateFromForm(form(), 'daily_fixed', ch({ source_metric_id: 'm1' }))
    expect(patch).not.toHaveProperty('source_exercise_id')
    expect(patch.source_metric_id).toBeNull()
  })
  it('formFromChallenge carries the exercise; hasAutoSource sees both kinds', () => {
    expect(formFromChallenge(ch({ source_exercise_id: 'e1' })).sourceExerciseId).toBe('e1')
    expect(hasAutoSource(ch())).toBe(false)
    expect(hasAutoSource(ch({ source_exercise_id: 'e1' }))).toBe(true)
    expect(hasAutoSource(ch({ source_metric_id: 'm1' }))).toBe(true)
  })
})
