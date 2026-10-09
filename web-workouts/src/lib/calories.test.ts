import { describe, expect, it } from 'vitest'
import { estimateExerciseCalories, hasCalorieActivity } from './calories'
import type { Exercise, WorkoutEntry } from './types'

const exercise: Exercise = {
  id: 'e1', user_id: 'u1', name: 'Squat', category: 'lower',
  tracks_weight: true, value_label: null, unit: 'kg', suggested_scheme: null, created_at: '2026-01-01',
}

describe('estimateExerciseCalories', () => {
  it('uses recorded duration when available', () => {
    const entries: WorkoutEntry[] = [{ id: 'x', user_id: 'u1', exercise_id: 'e1', date: '2026-10-06', notes: null, sets: [
      { reps: 10, weight: 50, time: null, duration: 10, side: null },
      { reps: 10, weight: 50, time: null, duration: 5, side: null },
    ]}]
    const result = estimateExerciseCalories(entries, exercise, 80)
    expect(result?.basis).toBe('duration')
    expect(result?.minutes).toBe(15)
    expect(result?.kcal).toBe(116)
  })

  it('falls back to a short estimated time per repetition', () => {
    const entries: WorkoutEntry[] = [{ id: 'x', user_id: 'u1', exercise_id: 'e1', date: '2026-10-06', notes: null, sets: [
      { reps: 20, weight: null, time: null, duration: null, side: null },
    ]}]
    const result = estimateExerciseCalories(entries, exercise, 70)
    expect(result?.basis).toBe('reps')
    // 20 повторов × 3 с + 60 с отдыха = 2 мин; MET 3.5 × 70 кг: 0.0175 × 3.5 × 70 × 2 = 8.575
    expect(result?.minutes).toBe(2)
    expect(result?.kcal).toBe(9)
  })

  it('учитывает отдых между подходами: 10 подходов по 10 повторов ≈ 64 ккал, а не ~33', () => {
    const sets = Array.from({ length: 10 }, () => ({ reps: 10, weight: 50, time: null, duration: null, side: null }))
    const entries: WorkoutEntry[] = [{ id: 'x', user_id: 'u1', exercise_id: 'e1', date: '2026-10-06', notes: null, sets }]
    // 10 × (10×3 + 60) с = 15 мин; 0.0175 × 3.5 × 70 × 15 = 64.3
    expect(estimateExerciseCalories(entries, exercise, 70)?.kcal).toBe(64)
  })

  it('веса нет — числа нет (раньше молча подставляли 70 кг)', () => {
    const entries: WorkoutEntry[] = [{ id: 'x', user_id: 'u1', exercise_id: 'e1', date: '2026-10-06', notes: null, sets: [
      { reps: 10, weight: null, time: null, duration: null, side: null },
    ]}]
    expect(estimateExerciseCalories(entries, exercise, null)).toBeNull()
    expect(estimateExerciseCalories(entries, exercise, undefined)).toBeNull()
    expect(estimateExerciseCalories(entries, exercise, 0)).toBeNull()
    expect(estimateExerciseCalories(entries, exercise, Number.NaN)).toBeNull()
  })

  it('время считается по записанной длительности в МИНУТАХ, а подходы без неё — по повторам, без двойного счёта', () => {
    const entries: WorkoutEntry[] = [{ id: 'x', user_id: 'u1', exercise_id: 'e1', date: '2026-10-06', notes: null, sets: [
      { reps: 10, weight: null, time: null, duration: 10, side: null },
      { reps: 20, weight: null, time: null, duration: null, side: null },
    ]}]
    const r = estimateExerciseCalories(entries, exercise, 80)
    expect(r?.minutes).toBe(12)
    // 0.0175 × 5.5 × 80 × 10 = 77 + 0.0175 × 3.5 × 80 × 2 = 9.8 → 87
    expect(r?.kcal).toBe(87)
    expect(r?.basis).toBe('duration')
  })

  it('hasCalorieActivity: отличает «нечего считать» от «нет веса»', () => {
    const e = (sets: WorkoutEntry['sets']): WorkoutEntry[] => [{ id: 'x', user_id: 'u1', exercise_id: 'e1', date: '2026-10-06', notes: null, sets }]
    expect(hasCalorieActivity([])).toBe(false)
    expect(hasCalorieActivity(e([{ reps: null, weight: 5, time: null, duration: null, side: null }]))).toBe(false)
    expect(hasCalorieActivity(e([{ reps: 5, weight: null, time: null, duration: null, side: null }]))).toBe(true)
    expect(hasCalorieActivity(e([{ reps: null, weight: null, time: null, duration: 12, side: null }]))).toBe(true)
  })

  it('returns null when there is no recorded activity', () => {
    expect(estimateExerciseCalories([], exercise, 70)).toBeNull()
  })
})
