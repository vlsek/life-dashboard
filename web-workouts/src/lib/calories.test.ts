import { describe, expect, it } from 'vitest'
import { estimateExerciseCalories } from './calories'
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
    expect(result?.minutes).toBe(1)
    expect(result?.kcal).toBe(7)
  })

  it('returns null when there is no recorded activity', () => {
    expect(estimateExerciseCalories([], exercise, 70)).toBeNull()
  })
})
