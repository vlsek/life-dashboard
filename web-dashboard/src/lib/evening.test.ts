import { describe, it, expect } from 'vitest'
import { EVENING_HOUR, isEveningTime, metricProgressLabel, remainingMetricsToday, shouldShowEveningReminder } from './evening'
import type { Metric } from './types'

function metric(over: Partial<Metric> & { id: string }): Metric {
  return {
    user_id: 'u',
    name: over.id,
    icon: null,
    type: 'boolean',
    unit: null,
    goal_value: null,
    goal_direction: null,
    schedule: null,
    category_id: null,
    position: 0,
    ...over,
  } as Metric
}

// 2026-09-29 — вторник (getDay() === 2)
const TUESDAY = '2026-09-29'

describe('isEveningTime', () => {
  it('false before 21:00 local, true from 21:00', () => {
    expect(EVENING_HOUR).toBe(21)
    expect(isEveningTime(new Date(2026, 8, 29, 20, 59))).toBe(false)
    expect(isEveningTime(new Date(2026, 8, 29, 21, 0))).toBe(true)
    expect(isEveningTime(new Date(2026, 8, 29, 23, 59))).toBe(true)
  })
  it('false in the small hours (a new day has not "become evening" yet)', () => {
    expect(isEveningTime(new Date(2026, 8, 30, 0, 5))).toBe(false)
  })
})

describe('remainingMetricsToday', () => {
  it('lists expected, not-done metrics of every type', () => {
    const ms = [
      metric({ id: 'read', type: 'boolean' }),
      metric({ id: 'pushups', type: 'number', goal_value: 50, goal_direction: 'at_least' }),
      metric({ id: 'mood', type: 'multiselect' }),
    ]
    const left = remainingMetricsToday(ms, { read: false, pushups: 20, mood: [] }, TUESDAY)
    expect(left.map((m) => m.id)).toEqual(['read', 'pushups', 'mood'])
  })
  it('skips metrics that are already done', () => {
    const ms = [
      metric({ id: 'read', type: 'boolean' }),
      metric({ id: 'pushups', type: 'number', goal_value: 50, goal_direction: 'at_least' }),
    ]
    expect(remainingMetricsToday(ms, { read: true, pushups: 50 }, TUESDAY)).toEqual([])
  })
  it('treats a missing value as not done', () => {
    expect(remainingMetricsToday([metric({ id: 'read' })], {}, TUESDAY).map((m) => m.id)).toEqual(['read'])
  })
  it('skips metrics not scheduled for today (days schedule without Tuesday)', () => {
    const onlyMonThu = metric({ id: 'gym', schedule: { type: 'days', days: [1, 4] } })
    const onTuesday = metric({ id: 'yoga', schedule: { type: 'days', days: [2] } })
    expect(remainingMetricsToday([onlyMonThu, onTuesday], {}, TUESDAY).map((m) => m.id)).toEqual(['yoga'])
  })
  it('skips weekly / at_most metrics (not tied to a particular day)', () => {
    const weekly = metric({ id: 'run', schedule: { type: 'weekly', min: 3 } })
    const atMost = metric({ id: 'sweets', schedule: { type: 'at_most', max: 2 } })
    expect(remainingMetricsToday([weekly, atMost], {}, TUESDAY)).toEqual([])
  })
  it('counts sets by total reps against the goal', () => {
    const sets = metric({ id: 'pull', type: 'sets', goal_value: 30, goal_direction: 'at_least' })
    expect(remainingMetricsToday([sets], { pull: [{ reps: 10 }, { reps: 10 }] }, TUESDAY)).toHaveLength(1)
    expect(remainingMetricsToday([sets], { pull: [{ reps: 15 }, { reps: 15 }] }, TUESDAY)).toHaveLength(0)
  })
})

describe('shouldShowEveningReminder', () => {
  const evening = new Date(2026, 8, 29, 21, 30)
  const afternoon = new Date(2026, 8, 29, 15, 0)
  it('shows in the evening when something is left and it was not dismissed today', () => {
    expect(shouldShowEveningReminder(evening, 2, null, TUESDAY)).toBe(true)
  })
  it('hidden before 21:00', () => {
    expect(shouldShowEveningReminder(afternoon, 2, null, TUESDAY)).toBe(false)
  })
  it('hidden when nothing is left', () => {
    expect(shouldShowEveningReminder(evening, 0, null, TUESDAY)).toBe(false)
  })
  it('hidden if dismissed today, but a dismissal from yesterday does not count', () => {
    expect(shouldShowEveningReminder(evening, 2, TUESDAY, TUESDAY)).toBe(false)
    expect(shouldShowEveningReminder(evening, 2, '2026-09-28', TUESDAY)).toBe(true)
  })
})

describe('metricProgressLabel', () => {
  it('number: done / goal unit', () => {
    const m = metric({ id: 'w', type: 'number', goal_value: 50, unit: 'reps' })
    expect(metricProgressLabel(m, 20)).toBe('20 / 50 reps')
  })
  it('number without value counts as 0, without unit has no trailing space', () => {
    const m = metric({ id: 'w', type: 'number', goal_value: 10 })
    expect(metricProgressLabel(m, undefined)).toBe('0 / 10')
  })
  it('sets: total reps / goal', () => {
    const m = metric({ id: 'p', type: 'sets', goal_value: 30 })
    expect(metricProgressLabel(m, [{ reps: 10 }, { reps: 5 }])).toBe('15 / 30')
  })
  it('boolean / multiselect: no label', () => {
    expect(metricProgressLabel(metric({ id: 'b', type: 'boolean' }), false)).toBe('')
    expect(metricProgressLabel(metric({ id: 'm', type: 'multiselect' }), [])).toBe('')
  })
})
