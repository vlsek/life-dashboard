import { describe, it, expect } from 'vitest'
import { calcBalance, isDone, type BalanceMetric } from './balance'
import { buildPointsLog, type LogMetric } from './pointsLog'

// Баланс профиля и журнал баллов используют то же правило, что кольца Дашборда (lib/metrics.ts, миграция 041), и считают
// каждый день по правилу того дня.
const rep = (n: number) => ({ reps: n })
const plan = [{ from: '2026-10-05', n: 3 }]
const bm: BalanceMetric = { id: 'm1', type: 'sets', goal_value: 0, goal_direction: 'at_least', planned_sets_log: plan }
const lm: LogMetric = { ...bm, name: 'Pushups', icon: null } as LogMetric
const values = [
  { date: '2026-10-04', metric_id: 'm1', value: [rep(10)] },
  { date: '2026-10-06', metric_id: 'm1', value: [rep(10)] },
  { date: '2026-10-07', metric_id: 'm1', value: [rep(10), rep(10), rep(10)] },
]

describe('balance / points log follow the planned sets rule', () => {
  it('isDone passes the day through', () => {
    expect(isDone(bm, [rep(10)], '2026-10-04')).toBe(true)
    expect(isDone(bm, [rep(10)], '2026-10-06')).toBe(false)
    expect(isDone(bm, [rep(10), rep(10), rep(10)], '2026-10-06')).toBe(true)
  })
  it('calcBalance: past day stays, a new day with one set gives no point', () => {
    expect(calcBalance([bm], values, [], [], [], []).total).toBe(2)
    expect(calcBalance([{ ...bm, planned_sets_log: null }], values, [], [], [], []).total).toBe(3)
  })
  it('buildPointsLog: same rule per day', () => {
    const log = buildPointsLog('2026-10-07', [lm], values, [], [], [], 4)
    const byDate = Object.fromEntries(log.days.map((d) => [d.date, d.earned]))
    expect(byDate['2026-10-04']).toBe(1)
    expect(byDate['2026-10-06']).toBe(0)
    expect(byDate['2026-10-07']).toBe(1)
  })
})
