import { describe, it, expect } from 'vitest'
import { calcTotalPoints, isMetricDone, plannedSetsFor, setsCount } from './points'
import type { Metric } from './types'

// Правило «подходов в день по плану» (миграция 041) — КОПИЯ из web-dashboard; баланс Магазина не должен «прыгать»:
// уже начисленные за прошлые дни баллы остаются, правило действует только с даты из журнала.
function sets(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', type: 'sets', active: true, goal_value: 0, goal_direction: 'at_least', ...o } as Metric
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

describe('shop balance', () => {
  it('points for past days stay, new days need N sets', () => {
    const m = sets({ planned_sets_log: log(['2026-10-05', 3]) })
    const values = [
      { date: '2026-10-04', metric_id: 'm1', value: [rep(10)] },
      { date: '2026-10-06', metric_id: 'm1', value: [rep(10)] },
      { date: '2026-10-07', metric_id: 'm1', value: [rep(10), rep(10), rep(10)] },
    ] as any
    expect(calcTotalPoints([m], values, [], [], [])).toBe(2) // 04 (старое правило) + 07 (три подхода); 06 — нет
    expect(calcTotalPoints([sets()], values, [], [], [])).toBe(3) // без параметра — все три
  })
})
