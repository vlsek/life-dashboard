import { describe, it, expect } from 'vitest'
import { metricDayPoints, metricDayPointsTenths, plannedSetsFracFor, plannedSetsLog, roundPoints } from './metrics'
import { calcBalance, dayPointsTenths, type BalanceMetric } from './balance'
import { buildPointsLog, type LogMetric } from './pointsLog'
import { pointsPerDaySeries } from './points-series'
import { formatPoints, formatPointsDelta, pointsDelta } from './pointsFloat'
import type { Metric, PlannedSetsEntry } from './types'

// Дробные баллы за подходы (миграция 045; BACKLOG 13; решение владельца 2026-10-03): метрика-подходы с планом N и записью журнала с frac:
// невыполненная даёт round(10·подходов/N)/10, но не больше 0,9; выполненная — 1. Прошлое не пересчитывается (записи без frac — как раньше).
// Копия SQL metric_partial_points — на любой паре «подходов × N» результаты совпадают (проверено на PostgreSQL: scripts/sql_harness).
function sets(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Pushups', icon: '💪', type: 'sets', unit: null, goal_value: 0, goal_direction: 'at_least', schedule: null,
    category_id: null, position: 0, ...o }
}
const reps = (k: number, r = 10) => Array.from({ length: k }, () => ({ reps: r }))
const fl = (from: string, n: number | null): PlannedSetsEntry => ({ from, n, frac: true })
const plan = (n: number, from = '2026-10-01') => sets({ planned_sets_log: [fl(from, n)] })

describe('metricDayPointsTenths: one set of N is 1/N of a point, rounded half up to 0.1, capped at 0.9 until fully done', () => {
  it('the owner\'s examples and the rounding table', () => {
    const d = '2026-10-05'
    expect(metricDayPoints(plan(5), reps(1) as any, d)).toBe(0.2) // 1 подход из 5 = 0,2
    expect(metricDayPoints(plan(2), reps(1) as any, d)).toBe(0.5) // из 2 = 0,5
    expect(metricDayPoints(plan(4), reps(1) as any, d)).toBe(0.3) // 0,25 вверх
    expect(metricDayPoints(plan(4), reps(3) as any, d)).toBe(0.8) // 0,75 вверх
    expect(metricDayPoints(plan(3), reps(1) as any, d)).toBe(0.3) // 0,333
    expect(metricDayPoints(plan(3), reps(2) as any, d)).toBe(0.7) // 0,667
    expect(metricDayPoints(plan(7), reps(1) as any, d)).toBe(0.1) // 0,143
  })
  it('fully done is exactly 1, also beyond the plan; empty and null are 0', () => {
    const d = '2026-10-05'
    expect(metricDayPoints(plan(4), reps(4) as any, d)).toBe(1)
    expect(metricDayPoints(plan(4), reps(9) as any, d)).toBe(1)
    expect(metricDayPoints(plan(4), [] as any, d)).toBe(0)
    expect(metricDayPoints(plan(4), null, d)).toBe(0)
    expect(metricDayPoints(plan(4), undefined as any, d)).toBe(0)
  })
  it('the ceiling: 19 of 20 sets is 0.9, never 1; volume goal not reached keeps it at 0.9', () => {
    expect(metricDayPoints(plan(20), reps(19, 1) as any, '2026-10-05')).toBe(0.9)
    const withVolume = sets({ goal_value: 50, planned_sets_log: [fl('2026-10-01', 3)] })
    expect(metricDayPoints(withVolume, reps(3, 10) as any, '2026-10-05')).toBe(0.9)
    expect(metricDayPoints(withVolume, reps(3, 20) as any, '2026-10-05')).toBe(1)
  })
  it('time-based sets count; the old plain number counts as no sets', () => {
    expect(metricDayPoints(plan(4), [{ time: '01:00' }, { time: '02:00' }, { reps: 0 }] as any, '2026-10-05')).toBe(0.5)
    expect(metricDayPoints(sets({ goal_value: 50, planned_sets_log: [fl('2026-10-01', 4)] }), 30 as any, '2026-10-05')).toBe(0)
  })
  it('matches an independent formula on every pair N=1..25 × sets 0..N-1 (same grid as the SQL scenario)', () => {
    for (let n = 1; n <= 25; n++)
      for (let k = 0; k < n; k++) {
        const want = Math.min(9, Math.floor((10 * k) / n + 0.5 + 1e-9))
        expect(metricDayPointsTenths(plan(n), reps(k) as any, '2026-10-05'), `N=${n} sets=${k}`).toBe(want)
      }
  })
})

describe('when fractional points do NOT apply (past is not recalculated)', () => {
  const one = reps(1) as any
  it('journal entries without the flag keep the old rule: a point only for a fully done metric', () => {
    const legacy = sets({ planned_sets_log: [{ from: '2026-10-01', n: 4 }] })
    expect(metricDayPoints(legacy, one, '2026-10-05')).toBe(0)
    expect(metricDayPoints(legacy, reps(4) as any, '2026-10-05')).toBe(1)
    expect(plannedSetsFracFor(legacy, '2026-10-05')).toBeNull()
  })
  it('days before the flagged entry use the previous entry; the flagged one counts from its date', () => {
    const m = sets({ planned_sets_log: [{ from: '2026-10-01', n: 4 }, fl('2026-10-10', 4)] })
    expect(metricDayPoints(m, one, '2026-10-09')).toBe(0)
    expect(metricDayPoints(m, one, '2026-10-10')).toBe(0.3)
    expect(metricDayPoints(sets({ planned_sets_log: [fl('2026-10-10', 4)] }), one, '2026-10-05')).toBe(1) // до записи — старое правило (цель 0 = выполнено)
  })
  it('changing N does not rewrite earlier days; removing the parameter returns the old rule', () => {
    const m = sets({ planned_sets_log: [fl('2026-10-01', 4), fl('2026-10-10', 2)] })
    expect(metricDayPoints(m, one, '2026-10-09')).toBe(0.3)
    expect(metricDayPoints(m, one, '2026-10-10')).toBe(0.5)
    const off = sets({ planned_sets_log: [fl('2026-10-01', 4), { from: '2026-10-20', n: null }] })
    expect(metricDayPoints(off, one, '2026-10-21')).toBe(1)
  })
  it('only sets metrics without "at most": other types and the flag as a string are ignored', () => {
    const l = [fl('2026-10-01', 4)]
    expect(metricDayPoints(sets({ type: 'number', goal_value: 5, planned_sets_log: l }), 3 as any, '2026-10-05')).toBe(0)
    expect(metricDayPoints(sets({ goal_direction: 'at_most', goal_value: 40, planned_sets_log: l }), one, '2026-10-05')).toBe(1)
    expect(metricDayPoints(sets({ goal_direction: 'at_most', goal_value: 40, planned_sets_log: l }), reps(1, 50) as any, '2026-10-05')).toBe(0)
    expect(metricDayPoints(sets({ type: 'boolean', planned_sets_log: l }), true as any, '2026-10-05')).toBe(1)
    expect(metricDayPoints(sets({ planned_sets_log: [{ from: '2026-10-01', n: 4, frac: 'true' as any }] }), one, '2026-10-05')).toBe(0)
  })
  it('plannedSetsLog keeps the flag only when it is strictly true', () => {
    expect(plannedSetsLog({ planned_sets_log: [{ from: '2026-10-01', n: 3, frac: true }, { from: '2026-10-02', n: 3, frac: false }, { from: '2026-10-03', n: 3 }] })).toEqual([
      { from: '2026-10-01', n: 3, frac: true }, { from: '2026-10-02', n: 3 }, { from: '2026-10-03', n: 3 },
    ])
  })
})

describe('sums are exact: balance, points log, chart series, animation delta', () => {
  const bm: BalanceMetric & { planned_sets_log: PlannedSetsEntry[] } = { id: 'm1', type: 'sets', goal_value: 0, goal_direction: 'at_least', planned_sets_log: [fl('2026-10-01', 4)] }
  const values = [
    { date: '2026-10-03', metric_id: 'm1', value: reps(4) }, // 1
    { date: '2026-10-04', metric_id: 'm1', value: reps(2) }, // 0,5
    { date: '2026-10-05', metric_id: 'm1', value: reps(1) }, // 0,3
  ]
  it('calcBalance adds tenths and prints no floating-point tail (1 + 0.5 + 0.3 = 1.8, goals +5)', () => {
    expect(calcBalance([bm], values, [], [], [], []).total).toBe(1.8)
    expect(calcBalance([bm], values, [{ points: null }], [], [], [2])).toEqual({ total: 6.8, spent: 2, bonus: 0, balance: 4.8 })
    // сумма 0,1 десять раз — ровно 1, а не 0,9999999999999999
    const tenTimes = Array.from({ length: 10 }, (_, i) => ({ date: `2026-10-${String(10 + i).padStart(2, '0')}`, metric_id: 'm1', value: reps(1) }))
    const seven: BalanceMetric & { planned_sets_log: PlannedSetsEntry[] } = { ...bm, planned_sets_log: [fl('2026-10-01', 7)] }
    expect(calcBalance([seven], tenTimes, [], [], [], []).total).toBe(1)
  })
  it('a day BEFORE the flagged entry keeps the old whole point in the balance and the chart (the past is not recalculated)', () => {
    const past = { date: '2026-09-30', metric_id: 'm1', value: reps(1) } // до записи журнала: цель 0 и подход есть = выполнено, 1 балл
    expect(calcBalance([bm], [past, ...values], [], [], [], []).total).toBe(2.8)
    expect(pointsPerDaySeries([sets({ planned_sets_log: [fl('2026-10-01', 4)] })], [past, ...values] as any).map((p) => p.y)).toEqual([1, 1, 0.5, 0.3])
  })
  it('the balance of the old rule is the same integer as before (no flag anywhere)', () => {
    const old: BalanceMetric = { id: 'm1', type: 'sets', goal_value: 0, goal_direction: 'at_least' }
    expect(calcBalance([old], values, [], [], [], []).total).toBe(3)
    expect(dayPointsTenths(old, reps(1), '2026-10-05')).toBe(10)
  })
  it('buildPointsLog lists fractional entries and rounds the totals', () => {
    const lm: LogMetric = { ...bm, name: 'Pushups', icon: null } as LogMetric
    const log = buildPointsLog('2026-10-05', [lm], values, [], [], [], 3)
    expect(log.days.map((d) => d.entries.map((e) => e.points))).toEqual([[0.3], [0.5], [1]])
    expect(log.earnedToday).toBe(0.3)
    expect(log.earnedWeek).toBe(1.8)
  })
  it('the points chart series is fractional per day', () => {
    const m = sets({ planned_sets_log: [fl('2026-10-01', 4)] })
    expect(pointsPerDaySeries([m], values as any).map((p) => p.y)).toEqual([1, 0.5, 0.3])
  })
  it('pointsDelta: each set adds its share; leaving the done state takes the whole point back', () => {
    const m = plan(4)
    expect(pointsDelta(m, reps(0) as any, reps(1) as any, '2026-10-05')).toBe(0.3)
    expect(pointsDelta(m, reps(1) as any, reps(2) as any, '2026-10-05')).toBe(0.2)
    expect(pointsDelta(m, reps(3) as any, reps(4) as any, '2026-10-05')).toBe(0.2) // 0,8 → 1
    expect(pointsDelta(m, reps(4) as any, reps(3) as any, '2026-10-05')).toBe(-0.2)
    expect(pointsDelta(m, reps(2) as any, reps(2) as any, '2026-10-05')).toBe(0)
    // не подходы: как раньше +1 / −1
    const num = sets({ type: 'number', goal_value: 10 })
    expect(pointsDelta(num, 8 as any, 12 as any)).toBe(1)
    expect(pointsDelta(num, 12 as any, 8 as any)).toBe(-1)
  })
})

describe('formatting', () => {
  it('formatPoints and formatPointsDelta use the language decimal separator; integers have no tail', () => {
    expect(formatPoints(12.3, 'ru')).toBe('12,3')
    expect(formatPoints(12.3, 'en')).toBe('12.3')
    expect(formatPoints(12, 'ru')).toBe('12')
    expect(formatPoints(Number.NaN)).toBe('')
    expect(formatPointsDelta(0.3, 'ru')).toBe('+0,3')
    expect(formatPointsDelta(-0.2, 'en')).toBe('\u22120.2')
    expect(roundPoints(12.299999999999999)).toBe(12.3)
  })
})
