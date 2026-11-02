import { describe, expect, it } from 'vitest'
import { buildPointsLog } from './pointsLog'
import type { LogMetric } from './pointsLog'

// BACKLOG 68.2 срез 4: в журнале баллов нет строки «−0» для вещей, которые баллов не тратят (награда за цель, вещь за огоньки).
const m: LogMetric = { id: 'a', name: 'Steps', icon: null, type: 'number', goal_value: 10, goal_direction: 'at_least' }
const today = '2026-09-30'
const base = (purchases: { name: string; cost: number | null; redeemed_date: string | null }[]) =>
  buildPointsLog(today, [m], [{ date: today, metric_id: 'a', value: 20 }], [], [], purchases)

describe('журнал баллов: покупки без цены в баллах', () => {
  it('награда за цель (cost 0) и вещь за огоньки (cost 0/null) не попадают в строки; покупка за баллы остаётся', () => {
    const log = base([
      { name: 'Кроссовки (награда за цель)', cost: 0, redeemed_date: today },
      { name: 'Кофе (за огоньки)', cost: null, redeemed_date: today },
      { name: 'Headphones', cost: 100, redeemed_date: today },
    ])
    expect(log.days[0].entries.map((e) => e.label)).toEqual(['Steps', 'Headphones'])
    expect(log.days[0].entries.map((e) => e.points)).toEqual([1, -100])
    expect(log.days[0].spent).toBe(100)
    expect(log.spentWeek).toBe(100)
  })

  it('только награда за цель в этот день — трат нет вообще', () => {
    const log = base([{ name: 'Кроссовки', cost: 0, redeemed_date: today }])
    expect(log.days[0].entries.some((e) => e.kind === 'spent')).toBe(false)
    expect(Math.abs(log.days[0].spent)).toBe(0) // «-0» из roundPoints(-0) — тот же ноль
    expect(Math.abs(log.spentWeek)).toBe(0)
  })
})
