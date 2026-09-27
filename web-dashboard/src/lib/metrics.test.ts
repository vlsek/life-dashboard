import { describe, it, expect } from 'vitest'
import { metricNumericValue, isMetricDone, metricSchedule, metricExpectedOn, metricCountsInDay } from './metrics'
import type { Metric } from './types'

function metric(overrides: Partial<Metric>): Metric {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test',
    icon: null,
    type: 'number',
    unit: null,
    goal_value: 1,
    goal_direction: 'at_least',
    schedule: null,
    category_id: null,
    position: 0,
    ...overrides,
  }
}

describe('metricNumericValue', () => {
  it('returns null for null/undefined', () => {
    expect(metricNumericValue(metric({}), null)).toBeNull()
    expect(metricNumericValue(metric({}), undefined)).toBeNull()
  })
  it('sums reps for type sets', () => {
    const m = metric({ type: 'sets' })
    expect(metricNumericValue(m, [{ reps: 10 }, { reps: 8 }, { reps: 5 }])).toBe(23)
  })
  it('treats a set entry with no reps as 0', () => {
    const m = metric({ type: 'sets' })
    expect(metricNumericValue(m, [{ reps: 10 }, {}])).toBe(10)
  })
  it('returns the number as-is for type number', () => {
    expect(metricNumericValue(metric({ type: 'number' }), 42)).toBe(42)
  })
  it('returns null for a non-numeric value on a number metric', () => {
    expect(metricNumericValue(metric({ type: 'number' }), true as any)).toBeNull()
  })
})

describe('isMetricDone', () => {
  it('boolean: done iff exactly true', () => {
    const m = metric({ type: 'boolean' })
    expect(isMetricDone(m, true)).toBe(true)
    expect(isMetricDone(m, false)).toBe(false)
  })
  it('multiselect: done iff non-empty array', () => {
    const m = metric({ type: 'multiselect' })
    expect(isMetricDone(m, ['a'])).toBe(true)
    expect(isMetricDone(m, [])).toBe(false)
  })
  it('number, at_least: done when value >= goal', () => {
    const m = metric({ type: 'number', goal_value: 5, goal_direction: 'at_least' })
    expect(isMetricDone(m, 5)).toBe(true)
    expect(isMetricDone(m, 4)).toBe(false)
  })
  it('number, at_most: done when 0 < value < goal (0 itself is not done)', () => {
    const m = metric({ type: 'number', goal_value: 5, goal_direction: 'at_most' })
    expect(isMetricDone(m, 4)).toBe(true)
    expect(isMetricDone(m, 0)).toBe(false)
    expect(isMetricDone(m, 5)).toBe(false)
  })
  it('sets: uses the summed reps against the goal', () => {
    const m = metric({ type: 'sets', goal_value: 20, goal_direction: 'at_least' })
    expect(isMetricDone(m, [{ reps: 10 }, { reps: 10 }])).toBe(true)
    expect(isMetricDone(m, [{ reps: 10 }])).toBe(false)
  })
  it('null/undefined value is never done', () => {
    expect(isMetricDone(metric({ type: 'boolean' }), null)).toBe(false)
  })
})

describe('metricSchedule', () => {
  it('null/garbage schedule normalizes to null (every day)', () => {
    expect(metricSchedule({ schedule: null })).toBeNull()
    expect(metricSchedule({ schedule: { type: 'bogus' } as any })).toBeNull()
  })
  it('days: rejects empty or full (7-day) lists as garbage -> null', () => {
    expect(metricSchedule({ schedule: { type: 'days', days: [] } as any })).toBeNull()
    expect(metricSchedule({ schedule: { type: 'days', days: [0, 1, 2, 3, 4, 5, 6] } as any })).toBeNull()
  })
  it('days: keeps a valid partial list', () => {
    expect(metricSchedule({ schedule: { type: 'days', days: [1, 3, 5] } as any })).toEqual({ type: 'days', days: [1, 3, 5] })
  })
  it('weekly: clamps min to 7 and floors it', () => {
    expect(metricSchedule({ schedule: { type: 'weekly', min: 3.7 } as any })).toEqual({ type: 'weekly', min: 3 })
    expect(metricSchedule({ schedule: { type: 'weekly', min: 30 } as any })).toEqual({ type: 'weekly', min: 7 })
  })
  it('weekly: min below 1 is garbage -> null', () => {
    expect(metricSchedule({ schedule: { type: 'weekly', min: 0 } as any })).toBeNull()
  })
  it('at_most: clamps max to 7, allows 0', () => {
    expect(metricSchedule({ schedule: { type: 'at_most', max: 0 } as any })).toEqual({ type: 'at_most', max: 0 })
    expect(metricSchedule({ schedule: { type: 'at_most', max: 30 } as any })).toEqual({ type: 'at_most', max: 7 })
  })
})

describe('metricExpectedOn', () => {
  it('no schedule -> expected every day', () => {
    expect(metricExpectedOn({ schedule: null }, '2026-09-28')).toBe(true) // понедельник
  })
  it('days schedule -> only on listed weekdays', () => {
    const m = { schedule: { type: 'days', days: [1, 3, 5] } as any } // пн/ср/пт
    expect(metricExpectedOn(m, '2026-09-28')).toBe(true) // пн
    expect(metricExpectedOn(m, '2026-09-29')).toBe(false) // вт
  })
  it('weekly/at_most schedules are never "expected on" a specific day', () => {
    expect(metricExpectedOn({ schedule: { type: 'weekly', min: 3 } as any }, '2026-09-28')).toBe(false)
    expect(metricExpectedOn({ schedule: { type: 'at_most', max: 2 } as any }, '2026-09-28')).toBe(false)
  })
})

describe('metricCountsInDay', () => {
  it('counts if expected today, regardless of done', () => {
    expect(metricCountsInDay({ schedule: null }, '2026-09-28', false)).toBe(true)
  })
  it('counts if not expected today but done anyway (bonus, not penalty)', () => {
    const m = { schedule: { type: 'weekly', min: 3 } as any }
    expect(metricCountsInDay(m, '2026-09-28', true)).toBe(true)
    expect(metricCountsInDay(m, '2026-09-28', false)).toBe(false)
  })
})
