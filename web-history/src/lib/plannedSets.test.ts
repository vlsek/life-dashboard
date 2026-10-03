import { describe, it, expect } from 'vitest'
import { isMetricDone, plannedSetsFor, setsCount } from './metrics'
import { dayStats, weekStats, type HistoryContext } from './stats'
import type { Metric } from './types'

// Правило «подходов в день по плану» (миграция 041) — КОПИЯ из web-dashboard; История обязана считать каждый день по правилу
// того дня (прошлое не пересчитываем).
function sets(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', name: 'Pushups', icon: '💪', type: 'sets', goal_value: 0, goal_direction: 'at_least', schedule: null, ...o } as Metric
}

const rep = (n: number) => ({ reps: n })
const log = (...e: [string, number | null][]) => e.map(([from, n]) => ({ from, n }))

describe('setsCount / plannedSetsFor (copy of the dashboard rule)', () => {
  it('counts sets with reps or time only', () => {
    expect(setsCount([rep(5), rep(0), {}, { time: '01:00' }])).toBe(2)
    expect(setsCount(null)).toBe(0)
  })
  it('takes the entry in force on the day; nothing before the first one or after removal; not for other types / at_most', () => {
    const m = sets({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4], ['2026-10-20', null]) })
    expect(plannedSetsFor(m, '2026-09-30')).toBeNull()
    expect(plannedSetsFor(m, '2026-10-09')).toBe(3)
    expect(plannedSetsFor(m, '2026-10-10')).toBe(4)
    expect(plannedSetsFor(m, '2026-10-20')).toBeNull()
    expect(plannedSetsFor(m)).toBeNull() // без даты — действующее сейчас (параметр снят)
    expect(plannedSetsFor({ ...m, type: 'number' }, '2026-10-05')).toBeNull()
    expect(plannedSetsFor({ ...m, goal_direction: 'at_most' }, '2026-10-05')).toBeNull()
  })
  it('survives dirty data', () => {
    expect(plannedSetsFor(sets({ planned_sets_log: 'oops' as any }), '2026-10-05')).toBeNull()
    expect(plannedSetsFor(sets({ planned_sets_log: [null as any, { from: 'bad', n: 5 }] }), '2026-10-05')).toBeNull()
  })
})

describe('isMetricDone with a planned number of sets', () => {
  const m = sets({ goal_value: 0, planned_sets_log: log(['2026-10-05', 3]) })
  it('needs N sets from the date the parameter was set, the old rule applies to earlier days', () => {
    expect(isMetricDone(m, [rep(10), rep(10)], '2026-10-05')).toBe(false)
    expect(isMetricDone(m, [rep(10), rep(10), rep(10)], '2026-10-05')).toBe(true)
    expect(isMetricDone(m, [rep(10)], '2026-10-04')).toBe(true)
  })
  it('both conditions apply when a total volume is set too; changing N does not rewrite earlier days', () => {
    const both = sets({ goal_value: 50, planned_sets_log: log(['2026-10-01', 3]) })
    expect(isMetricDone(both, [rep(10), rep(10), rep(10)], '2026-10-02')).toBe(false)
    expect(isMetricDone(both, [rep(60)], '2026-10-02')).toBe(false)
    expect(isMetricDone(both, [rep(20), rep(20), rep(20)], '2026-10-02')).toBe(true)
    const changed = sets({ planned_sets_log: log(['2026-10-01', 3], ['2026-10-10', 4]) })
    expect(isMetricDone(changed, [rep(1), rep(1), rep(1)], '2026-10-09')).toBe(true)
    expect(isMetricDone(changed, [rep(1), rep(1), rep(1)], '2026-10-10')).toBe(false)
  })
  it('without a parameter nothing changes', () => {
    expect(isMetricDone(sets({ goal_value: 20 }), [rep(25)], '2026-10-05')).toBe(true)
    expect(isMetricDone(sets({ goal_value: 20 }), [rep(25)])).toBe(true)
    expect(isMetricDone(sets({ goal_value: 20 }), [rep(5)])).toBe(false)
  })
})

describe('History stats use the rule of each day', () => {
  const m = sets({ planned_sets_log: log(['2026-10-05', 3]) })
  const one = [rep(10)]
  const ctx = {
    metrics: [m],
    byDate: { '2026-10-04': { m1: one }, '2026-10-06': { m1: one } },
    notesByDate: {},
    goals: [],
    settings: { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' },
    firstDate: '2026-09-21',
    today: '2026-10-10',
  } as unknown as HistoryContext
  it('dayStats: the same single set is a done day before the plan and not done after it', () => {
    expect(dayStats(ctx, '2026-10-04')).toMatchObject({ done: 1, total: 1 })
    expect(dayStats(ctx, '2026-10-06')).toMatchObject({ done: 0, total: 1 })
  })
  it('weekStats counts the week day by day', () => {
    const w = weekStats(ctx, '2026-10-05')! // неделя после старта плана: ни один день с одним подходом не засчитан
    expect(w.done).toBe(0)
    const old = weekStats({ ...ctx, metrics: [sets()] } as HistoryContext, '2026-10-05')!
    expect(old.done).toBeGreaterThan(0) // без параметра — по-старому
  })
})
