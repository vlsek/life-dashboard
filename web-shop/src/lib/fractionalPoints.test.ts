import { describe, it, expect } from 'vitest'
import { calcBalanceFromTotals, calcTotalPoints, metricDayPointsTenths, plannedSetsFracFor } from './points'
import type { Metric, PlannedSetsEntry } from './types'

// Дробные баллы за подходы (миграция 045) — КОПИЯ правила из web-dashboard: баланс Магазина совпадает с профилем Дашборда и сервером.
function sets(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', type: 'sets', active: true, goal_value: 0, goal_direction: 'at_least', ...o } as Metric
}
const reps = (k: number, r = 10) => Array.from({ length: k }, () => ({ reps: r }))
const fl = (from: string, n: number | null): PlannedSetsEntry => ({ from, n, frac: true })
const plan = (n: number, from = '2026-10-01') => sets({ planned_sets_log: [fl(from, n)] })

describe('shop: fractional points (copy of the dashboard rule)', () => {
  it('one set of N is 1/N of a point (half up to 0.1), capped at 0.9, a done metric is 1', () => {
    const d = '2026-10-05'
    expect(metricDayPointsTenths(plan(5), reps(1) as any, d)).toBe(2)
    expect(metricDayPointsTenths(plan(4), reps(1) as any, d)).toBe(3)
    expect(metricDayPointsTenths(plan(4), reps(3) as any, d)).toBe(8)
    expect(metricDayPointsTenths(plan(4), reps(4) as any, d)).toBe(10)
    expect(metricDayPointsTenths(plan(20), reps(19, 1) as any, d)).toBe(9)
    expect(metricDayPointsTenths(plan(4), null, d)).toBe(0)
  })
  it('same grid as SQL and the dashboard: N=1..25 × sets 0..N-1', () => {
    for (let n = 1; n <= 25; n++)
      for (let k = 0; k < n; k++)
        expect(metricDayPointsTenths(plan(n), reps(k) as any, '2026-10-05'), `N=${n} sets=${k}`).toBe(Math.min(9, Math.floor((10 * k) / n + 0.5 + 1e-9)))
  })
  it('the past is not recalculated: no flag / before the entry / other types keep the old integer points', () => {
    const one = reps(1) as any
    expect(metricDayPointsTenths(sets({ planned_sets_log: [{ from: '2026-10-01', n: 4 }] }), one, '2026-10-05')).toBe(0)
    expect(metricDayPointsTenths(sets({ planned_sets_log: [fl('2026-10-10', 4)] }), one, '2026-10-05')).toBe(10)
    expect(metricDayPointsTenths(sets({ type: 'number', goal_value: 5, planned_sets_log: [fl('2026-10-01', 4)] }), 3 as any, '2026-10-05')).toBe(0)
    expect(plannedSetsFracFor(sets({ goal_direction: 'at_most', planned_sets_log: [fl('2026-10-01', 4)] }), '2026-10-05')).toBeNull()
  })
  it('calcTotalPoints sums tenths exactly and keeps goals/skills/books whole; balance has no floating-point tail', () => {
    const m = plan(4)
    const values = [
      { date: '2026-10-03', metric_id: 'm1', value: reps(4) }, // 1
      { date: '2026-10-04', metric_id: 'm1', value: reps(2) }, // 0,5
      { date: '2026-10-05', metric_id: 'm1', value: reps(1) }, // 0,3
    ] as any
    expect(calcTotalPoints([m], values, [], [], [])).toBe(1.8)
    expect(calcTotalPoints([m], values, [{ points: null }] as any, [], [])).toBe(6.8)
    const seven = plan(7)
    const ten = Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-${String(10 + i).padStart(2, '0')}`, metric_id: 'm1', value: reps(1) })) as any
    expect(calcTotalPoints([seven], ten, [], [], [])).toBe(1) // десять раз по 0,1 — ровно 1
    expect(calcBalanceFromTotals(6.8, [2])).toEqual({ total: 6.8, spent: 2, bonus: 0, balance: 4.8 })
    // старое правило: целые, как раньше
    expect(calcTotalPoints([sets()], values, [], [], [])).toBe(3)
  })
})
