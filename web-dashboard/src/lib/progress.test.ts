import { describe, it, expect } from 'vitest'
import { computeDayProgressPure, computeWeekProgressPure, getWeekDates, progressPercent } from './progress'
import type { DayProgressSettings } from './progressSettings'
import type { Metric } from './types'

const SETTINGS: DayProgressSettings = {
  enabled: true,
  includePlanned: true,
  includeMetrics: true,
  dayPlace: 'avatar',
  weekPlace: 'profile',
}

function metric(overrides: Partial<Metric>): Metric {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test',
    icon: null,
    type: 'boolean',
    unit: null,
    goal_value: null,
    goal_direction: null,
    schedule: null,
    category_id: null,
    position: 0,
    ...overrides,
  }
}

describe('computeDayProgressPure', () => {
  it('returns null when progress tracking is disabled', () => {
    expect(computeDayProgressPure({ ...SETTINGS, enabled: false }, [], {}, '2026-09-28', [], [])).toBeNull()
  })

  it('counts expected metrics as total, done ones as done', () => {
    const m1 = metric({ id: 'm1' })
    const m2 = metric({ id: 'm2' })
    const res = computeDayProgressPure(SETTINGS, [m1, m2], { m1: true, m2: false }, '2026-09-28', [], [])
    expect(res).toEqual({ done: 1, total: 2, bonusPct: 0 })
  })

  it('at_most-scheduled metrics are excluded from the day total (belong to the week)', () => {
    const m = metric({ id: 'm1', schedule: { type: 'at_most', max: 2 } })
    const res = computeDayProgressPure(SETTINGS, [m], { m1: true }, '2026-09-28', [], [])
    expect(res).toEqual({ done: 0, total: 0, bonusPct: 0 })
  })

  it('a metric not expected today and not done is skipped entirely (no penalty)', () => {
    const m = metric({ id: 'm1', schedule: { type: 'days', days: [2] } }) // только по вторникам
    const res = computeDayProgressPure(SETTINGS, [m], {}, '2026-09-28', [], []) // 28-е — понедельник
    expect(res).toEqual({ done: 0, total: 0, bonusPct: 0 })
  })

  it('a custom (non-goal) planned item counts by its own done flag', () => {
    const res = computeDayProgressPure(SETTINGS, [], {}, '2026-09-28', [{ text: 'Custom', done: true }], [])
    expect(res).toEqual({ done: 1, total: 1, bonusPct: 0 })
  })

  it('a goal-type planned item resolves against allGoals by name, single-stage uses done', () => {
    const goals = [{ name: 'Learn X', done: true }]
    const res = computeDayProgressPure(SETTINGS, [], {}, '2026-09-28', [{ type: 'goal', text: 'Learn X' }], goals)
    expect(res).toEqual({ done: 1, total: 1, bonusPct: 0 })
  })

  it('a multi-stage goal is done only once current_stage reaches stages', () => {
    const goals = [{ name: 'Learn X', done: false, stages: 3, current_stage: 2 }]
    const res = computeDayProgressPure(SETTINGS, [], {}, '2026-09-28', [{ type: 'goal', text: 'Learn X' }], goals)
    expect(res).toEqual({ done: 0, total: 1, bonusPct: 0 })
  })

  it('a planned item referencing a deleted goal is silently skipped', () => {
    const res = computeDayProgressPure(SETTINGS, [], {}, '2026-09-28', [{ type: 'goal', text: 'Gone' }], [])
    expect(res).toEqual({ done: 0, total: 0, bonusPct: 0 })
  })

  it('bonus items add bonusPct when done and never touch the base total, even if includePlanned is off', () => {
    const settings = { ...SETTINGS, includePlanned: false }
    const res = computeDayProgressPure(settings, [], {}, '2026-09-28', [{ text: 'Extra', done: true, bonus: true }], [])
    expect(res).toEqual({ done: 0, total: 0, bonusPct: 20 })
  })

  it('includePlanned=false excludes non-bonus planned items from the base total', () => {
    const settings = { ...SETTINGS, includePlanned: false }
    const res = computeDayProgressPure(settings, [], {}, '2026-09-28', [{ text: 'X', done: true }], [])
    expect(res).toEqual({ done: 0, total: 0, bonusPct: 0 })
  })
})

describe('getWeekDates', () => {
  it('returns Monday..Sunday for the week containing "today"', () => {
    const dates = getWeekDates(new Date('2026-09-30T00:00:00')) // среда
    expect(dates).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
  })
})

describe('computeWeekProgressPure', () => {
  it('a "weekly" metric contributes min slots, done = capped count of done days', () => {
    const m = metric({ id: 'm1', schedule: { type: 'weekly', min: 3 } })
    const dates = ['2026-09-28', '2026-09-29', '2026-09-30']
    const valuesByDate = {
      '2026-09-28': { m1: true },
      '2026-09-29': { m1: true },
      '2026-09-30': { m1: false },
    }
    const res = computeWeekProgressPure(SETTINGS, [m], valuesByDate, dates, {}, [])
    expect(res).toEqual({ done: 2, total: 3, bonusPct: 0 })
  })

  it('an "at_most" metric contributes exactly one slot, done iff within the limit', () => {
    const m = metric({ id: 'm1', schedule: { type: 'at_most', max: 1 } })
    const dates = ['2026-09-28', '2026-09-29']
    const valuesByDate = { '2026-09-28': { m1: true }, '2026-09-29': { m1: true } } // 2 > max 1
    const res = computeWeekProgressPure(SETTINGS, [m], valuesByDate, dates, {}, [])
    expect(res).toEqual({ done: 0, total: 1, bonusPct: 0 })
  })

  it('an everyday metric contributes one slot per day it is expected', () => {
    const m = metric({ id: 'm1' })
    const dates = ['2026-09-28', '2026-09-29']
    const valuesByDate = { '2026-09-28': { m1: true }, '2026-09-29': { m1: false } }
    const res = computeWeekProgressPure(SETTINGS, [m], valuesByDate, dates, {}, [])
    expect(res).toEqual({ done: 1, total: 2, bonusPct: 0 })
  })

  it('sums planned items across every date in the range', () => {
    const plannedByDate = {
      '2026-09-28': [{ text: 'A', done: true }],
      '2026-09-29': [{ text: 'B', done: false }],
    }
    const res = computeWeekProgressPure(SETTINGS, [], {}, ['2026-09-28', '2026-09-29'], plannedByDate, [])
    expect(res).toEqual({ done: 1, total: 2, bonusPct: 0 })
  })
})

describe('progressPercent', () => {
  it('rounds the base percentage and adds bonus on top (can exceed 100)', () => {
    expect(progressPercent({ done: 1, total: 3, bonusPct: 0 })).toBe(33)
    expect(progressPercent({ done: 3, total: 3, bonusPct: 20 })).toBe(120)
  })
  it('total=0 with only a bonus still yields the bonus percent', () => {
    expect(progressPercent({ done: 0, total: 0, bonusPct: 20 })).toBe(20)
  })
})
