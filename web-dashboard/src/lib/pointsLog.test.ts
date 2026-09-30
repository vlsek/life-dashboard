import { describe, expect, it } from 'vitest'
import { buildPointsLog, windowDates } from './pointsLog'
import type { LogMetric } from './pointsLog'

const m = (o: Partial<LogMetric> = {}): LogMetric => ({
  id: 'm1', name: 'Steps', icon: null, type: 'number', goal_value: 10, goal_direction: 'at_least', ...o,
})

describe('windowDates', () => {
  it('returns today first and the previous days, newest on top', () => {
    expect(windowDates('2026-09-30', 3)).toEqual(['2026-09-30', '2026-09-29', '2026-09-28'])
  })
  it('is calendar arithmetic across a month border', () => {
    expect(windowDates('2026-10-02', 4)).toEqual(['2026-10-02', '2026-10-01', '2026-09-30', '2026-09-29'])
  })
  it('does not skip or repeat a day across the DST switch (last Sunday of October)', () => {
    const d = windowDates('2026-10-26', 3)
    expect(d).toEqual(['2026-10-26', '2026-10-25', '2026-10-24'])
  })
  it('defaults to 7 days', () => {
    expect(windowDates('2026-09-30')).toHaveLength(7)
  })
})

describe('buildPointsLog', () => {
  const today = '2026-09-30'
  it('gives +1 per completed daily metric on its day and ignores unfinished ones', () => {
    const log = buildPointsLog(
      today,
      [m({ id: 'a', name: 'Steps' }), m({ id: 'b', name: 'Read', type: 'boolean', goal_value: null })],
      [
        { date: today, metric_id: 'a', value: 12 },
        { date: today, metric_id: 'b', value: false },
        { date: '2026-09-29', metric_id: 'b', value: true },
        { date: '2026-09-28', metric_id: 'a', value: 3 },
      ],
      [], [], [],
    )
    expect(log.days[0].entries.map((e) => e.label)).toEqual(['Steps'])
    expect(log.days[1].entries.map((e) => e.label)).toEqual(['Read'])
    expect(log.days[2].entries).toEqual([])
    expect(log.earnedToday).toBe(1)
    expect(log.earnedWeek).toBe(2)
  })
  it('respects at_most goals like the balance does (0 is not a point)', () => {
    const log = buildPointsLog(today, [m({ id: 'a', goal_value: 5, goal_direction: 'at_most' })],
      [{ date: today, metric_id: 'a', value: 0 }, { date: '2026-09-29', metric_id: 'a', value: 3 }], [], [], [])
    expect(log.earnedToday).toBe(0)
    expect(log.days[1].earned).toBe(1)
  })
  it('counts goals and books by their done date with default points 5 and 10', () => {
    const log = buildPointsLog(today, [], [],
      [{ name: 'Marathon', points: null, done_date: today }, { name: 'Old', points: 50, done_date: '2026-01-01' }],
      [{ title: 'Dune', points: null, done_date: '2026-09-29' }, { title: 'Custom', points: 30, done_date: '2026-09-29' }],
      [])
    expect(log.days[0].entries).toEqual([{ kind: 'goal', label: 'Marathon', icon: null, points: 5 }])
    expect(log.days[1].entries.map((e) => e.points)).toEqual([10, 30])
    expect(log.earnedWeek).toBe(45)
  })
  it('shows purchases as negative entries and totals spending separately', () => {
    const log = buildPointsLog(today, [m({ id: 'a' })], [{ date: today, metric_id: 'a', value: 20 }], [], [],
      [{ name: 'Headphones', cost: 100, redeemed_date: today }])
    expect(log.days[0].entries.map((e) => e.points)).toEqual([1, -100])
    expect(log.days[0].earned).toBe(1)
    expect(log.days[0].spent).toBe(100)
    expect(log.spentWeek).toBe(100)
    expect(log.earnedToday).toBe(1)
  })
  it('ignores rows outside the window', () => {
    const log = buildPointsLog(today, [m({ id: 'a' })], [{ date: '2026-09-01', metric_id: 'a', value: 99 }], [], [], [])
    expect(log.earnedWeek).toBe(0)
  })
})
