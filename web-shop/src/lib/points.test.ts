import { describe, it, expect } from 'vitest'
import { metricNumericValue, isMetricDone, calcTotalPoints, calcBalanceFromTotals } from './points'
import type { Metric } from './types'

describe('metricNumericValue', () => {
  it('sums reps for "sets" type', () => {
    expect(metricNumericValue({ type: 'sets' }, [{ reps: 10 }, { reps: 8 }, {}])).toBe(18)
  })
  it('passes through plain numbers, null otherwise', () => {
    expect(metricNumericValue({ type: 'number' }, 5)).toBe(5)
    expect(metricNumericValue({ type: 'number' }, 'x' as unknown as number)).toBeNull()
    expect(metricNumericValue({ type: 'number' }, null)).toBeNull()
  })
})

const baseMetric: Metric = { id: 'm1', type: 'boolean', active: true, goal_value: null, goal_direction: null }

describe('isMetricDone', () => {
  it('boolean: strictly true only', () => {
    expect(isMetricDone(baseMetric, true)).toBe(true)
    expect(isMetricDone(baseMetric, false)).toBe(false)
    expect(isMetricDone(baseMetric, null)).toBe(false)
  })

  it('multiselect: done when non-empty array', () => {
    const m = { ...baseMetric, type: 'multiselect' as const }
    expect(isMetricDone(m, ['a'])).toBe(true)
    expect(isMetricDone(m, [])).toBe(false)
  })

  it('number, goal_direction "at_least" (default): done when value >= goal', () => {
    const m = { ...baseMetric, type: 'number' as const, goal_value: 10 }
    expect(isMetricDone(m, 10)).toBe(true)
    expect(isMetricDone(m, 9)).toBe(false)
  })

  it('number, goal_direction "at_most": done when 0 < value < goal', () => {
    const m = { ...baseMetric, type: 'number' as const, goal_value: 5, goal_direction: 'at_most' as const }
    expect(isMetricDone(m, 4)).toBe(true)
    expect(isMetricDone(m, 5)).toBe(false)
    expect(isMetricDone(m, 0)).toBe(false)
  })

  it('sets: uses summed reps against goal_value', () => {
    const m = { ...baseMetric, type: 'sets' as const, goal_value: 20 }
    expect(isMetricDone(m, [{ reps: 12 }, { reps: 10 }])).toBe(true)
    expect(isMetricDone(m, [{ reps: 5 }])).toBe(false)
  })
})

describe('calcTotalPoints', () => {
  it('1 point per done metric per day, plus points from done goals/mastered skills/done books', () => {
    const metrics: Metric[] = [
      { id: 'water', type: 'boolean', active: true, goal_value: null, goal_direction: null },
      { id: 'pushups', type: 'number', active: true, goal_value: 20, goal_direction: null },
    ]
    const values = [
      { date: '2026-06-01', metric_id: 'water', value: true },
      { date: '2026-06-01', metric_id: 'pushups', value: 25 }, // done
      { date: '2026-06-02', metric_id: 'water', value: false }, // not done
      { date: '2026-06-02', metric_id: 'pushups', value: 20 }, // done
    ]
    // dailyPoints = 3 (01: water+pushups=2, 02: pushups=1)
    const goals = [{ done: true, points: 5 }, { done: true, points: null }] // 5 + 5(default) = 10
    const skills = [{ mastered: true, points: 20 }] // 20
    const books = [{ status: 'done', points: null }] // 10 (default)
    expect(calcTotalPoints(metrics, values, goals, skills, books)).toBe(3 + 10 + 20 + 10)
  })

  it('returns 0 with no data', () => {
    expect(calcTotalPoints([], [], [], [], [])).toBe(0)
  })
})

describe('calcBalanceFromTotals', () => {
  it('balance = total - sum of redeemed item costs', () => {
    expect(calcBalanceFromTotals(100, [30, 15])).toEqual({ total: 100, spent: 45, bonus: 0, balance: 55 })
  })
  it('handles no redeemed items', () => {
    expect(calcBalanceFromTotals(50, [])).toEqual({ total: 50, spent: 0, bonus: 0, balance: 50 })
  })
})
