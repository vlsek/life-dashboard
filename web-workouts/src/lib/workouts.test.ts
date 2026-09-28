import { describe, expect, it } from 'vitest'
import {
  bestPaceRecord,
  bestSetRecord,
  categoryRank,
  cleanSets,
  exerciseBilateralField,
  exerciseDurationField,
  formatSets,
  isKnownCategory,
  paceText,
  sortCategoryKeys,
} from './workouts'
import type { Exercise, WorkoutEntry } from './types'

function ex(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'ex1',
    user_id: 'u1',
    name: 'Bench press',
    category: null,
    tracks_weight: true,
    value_label: 'Reps',
    unit: 'kg',
    suggested_scheme: null,
    created_at: '2026-01-01',
    ...overrides,
  }
}

describe('bestSetRecord', () => {
  it('picks the heaviest weight for a weighted exercise, tie-broken by reps', () => {
    const entries: WorkoutEntry[] = [
      { id: '1', user_id: 'u', exercise_id: 'ex1', date: '2026-01-01', sets: [{ reps: 10, weight: 60, time: null, duration: null, side: null }], notes: null },
      { id: '2', user_id: 'u', exercise_id: 'ex1', date: '2026-01-05', sets: [{ reps: 8, weight: 80, time: null, duration: null, side: null }], notes: null },
      { id: '3', user_id: 'u', exercise_id: 'ex1', date: '2026-01-03', sets: [{ reps: 6, weight: 80, time: null, duration: null, side: null }], notes: null },
    ]
    const best = bestSetRecord(entries, ex(), 'kg')
    expect(best).toEqual({ text: '8×80kg', date: '2026-01-05' })
  })

  it('picks the most reps for a bodyweight exercise', () => {
    const entries: WorkoutEntry[] = [
      { id: '1', user_id: 'u', exercise_id: 'ex1', date: '2026-01-01', sets: [{ reps: 20, weight: null, time: null, duration: null, side: null }], notes: null },
      { id: '2', user_id: 'u', exercise_id: 'ex1', date: '2026-01-02', sets: [{ reps: 25, weight: null, time: null, duration: null, side: null }], notes: null },
    ]
    const best = bestSetRecord(entries, ex({ tracks_weight: false, unit: null }), 'kg')
    expect(best).toEqual({ text: '25', date: '2026-01-02' })
  })

  it('returns null with no sets logged', () => {
    expect(bestSetRecord([], ex(), 'kg')).toBeNull()
  })

  it('filters by side when sideFilter is given', () => {
    const entries: WorkoutEntry[] = [
      { id: '1', user_id: 'u', exercise_id: 'ex1', date: '2026-01-01', sets: [{ reps: 10, weight: 40, time: null, duration: null, side: 'L' }], notes: null },
      { id: '2', user_id: 'u', exercise_id: 'ex1', date: '2026-01-02', sets: [{ reps: 10, weight: 50, time: null, duration: null, side: 'R' }], notes: null },
    ]
    expect(bestSetRecord(entries, ex({ bilateral: true }), 'kg', 'L')?.text).toBe('10×40kg')
    expect(bestSetRecord(entries, ex({ bilateral: true }), 'kg', 'R')?.text).toBe('10×50kg')
  })
})

describe('paceText / bestPaceRecord', () => {
  it('formats pace as value-per-hour with the duration', () => {
    expect(paceText(2.6, 30, 'km', 'h', 'min')).toBe('30 min · 5.2 km/h')
  })
  it('rounds to a whole number once pace reaches double digits', () => {
    expect(paceText(20, 30, 'km', 'h', 'min')).toBe('30 min · 40 km/h')
  })
  it('returns empty string with zero duration', () => {
    expect(paceText(5, 0, 'km', 'h', 'min')).toBe('')
  })

  it('finds the fastest pace across entries, ignoring exercises without tracks_duration', () => {
    const entries: WorkoutEntry[] = [
      { id: '1', user_id: 'u', exercise_id: 'ex1', date: '2026-01-01', sets: [{ reps: 5, weight: null, time: null, duration: 30, side: null }], notes: null },
      { id: '2', user_id: 'u', exercise_id: 'ex1', date: '2026-01-02', sets: [{ reps: 10, weight: null, time: null, duration: 30, side: null }], notes: null },
    ]
    expect(bestPaceRecord(entries, ex({ tracks_weight: false, tracks_duration: false }), 'h', 'min')).toBeNull()
    const best = bestPaceRecord(entries, ex({ tracks_weight: false, tracks_duration: true, value_label: 'km' }), 'h', 'min')
    expect(best?.date).toBe('2026-01-02')
  })
})

describe('formatSets', () => {
  it('joins weighted sets with the × separator', () => {
    const e = ex()
    const sets = [
      { reps: 8, weight: 60, time: null, duration: null, side: null },
      { reps: 6, weight: 65, time: '10:00', duration: null, side: null },
    ]
    expect(formatSets(sets, e, 'h', 'min')).toBe('8×60kg, 6×65kg (10:00)')
  })
  it('returns an em dash for no sets', () => {
    expect(formatSets([], ex(), 'h', 'min')).toBe('—')
    expect(formatSets(null, ex(), 'h', 'min')).toBe('—')
  })
})

describe('category ordering', () => {
  it('ranks known categories in the fixed order, unknowns after, blank last', () => {
    expect(categoryRank('upper')).toBeLessThan(categoryRank('lower'))
    expect(categoryRank('lower')).toBeLessThan(categoryRank('fullbody'))
    expect(categoryRank('fullbody')).toBeLessThan(categoryRank('custom'))
    expect(categoryRank('custom')).toBeLessThan(categoryRank('Legacy Category'))
    expect(categoryRank('Legacy Category')).toBeLessThan(categoryRank(''))
  })
  it('isKnownCategory matches the fixed four', () => {
    expect(isKnownCategory('upper')).toBe(true)
    expect(isKnownCategory('')).toBe(false)
    expect(isKnownCategory('Push Day')).toBe(false)
  })
  it('sortCategoryKeys orders fixed categories first, then alphabetically, blank last', () => {
    const keys = ['', 'zzz-custom', 'fullbody', 'upper', 'aaa-custom']
    const sorted = sortCategoryKeys(keys, (k) => k || 'Uncategorized')
    expect(sorted).toEqual(['upper', 'fullbody', 'aaa-custom', 'zzz-custom', ''])
  })
})

describe('exerciseDurationField / exerciseBilateralField (migration-compat)', () => {
  it('omits the field entirely when the existing row has no such column (migration not applied)', () => {
    expect(exerciseDurationField(true, ex())).toEqual({})
    expect(exerciseBilateralField(true, ex())).toEqual({})
  })
  it('sends the field when the existing row already carries that column', () => {
    const withDuration = ex({ tracks_duration: false })
    expect(exerciseDurationField(true, withDuration)).toEqual({ tracks_duration: true })
    const withBilateral = ex({ bilateral: false })
    expect(exerciseBilateralField(false, withBilateral)).toEqual({ bilateral: false })
  })
  it('omits the field for a brand-new exercise (existing = null)', () => {
    expect(exerciseDurationField(true, null)).toEqual({})
  })
})

describe('cleanSets', () => {
  it('drops rows with no reps entered and coerces strings to numbers', () => {
    const raw = [
      { reps: '10' as unknown as number, weight: '60' as unknown as number, time: '09:00', duration: null, side: null },
      { reps: '' as unknown as number, weight: null, time: null, duration: null, side: null },
      { reps: 8, weight: null, time: null, duration: '' as unknown as number, side: 'L' as const },
    ]
    const cleaned = cleanSets(raw)
    expect(cleaned).toEqual([
      { reps: 10, weight: 60, time: '09:00', duration: null, side: null },
      { reps: 8, weight: null, time: null, duration: null, side: 'L' },
    ])
  })
})
