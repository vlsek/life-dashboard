import { describe, expect, it } from 'vitest'
import { computeDayProgressPure, computeWeekProgressPure, progressPercent, type GoalLite, type PlannedItem } from './progress'
import { daySummary, isItemDone, itemSharePct, weekSummary } from './progressSummary'
import type { DayProgressSettings } from './progressSettings'
import type { Metric } from './types'

const settings: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' }

function metric(over: Partial<Metric> & { id: string; name: string }): Metric {
  return { user_id: 'u', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null as any, category_id: null, position: 0, ...over } as Metric
}
const water = metric({ id: 'w', name: 'Вода' })
const pushups = metric({ id: 'p', name: 'Отжимания' })
const goals: GoalLite[] = [{ name: 'Цель', done: true }]
const plans: PlannedItem[] = [
  { text: 'Позвонить', done: true },
  { text: 'Уборка', done: false },
  { text: 'Бонус-план', done: true, bonus: true },
  { text: 'Бонус-невыполненный', done: false, bonus: true },
  { type: 'goal', text: 'Цель' },
  { type: 'goal', text: 'Удалённая цель' },
]

describe('daySummary согласован с computeDayProgressPure', () => {
  const byToday = { w: true, p: false }
  it('вес/сделано/бонус/процент совпадают с кольцом; удалённая цель не в счёте', () => {
    const ring = computeDayProgressPure(settings, [water, pushups], byToday, '2026-09-30', plans, goals)!
    const s = daySummary(settings, [water, pushups], byToday, '2026-09-30', plans, goals)
    expect(s.total).toBe(ring.total)
    expect(s.done).toBe(ring.done)
    expect(s.bonusPct).toBe(ring.bonusPct)
    expect(s.totalPct).toBe(progressPercent(ring))
    expect(s.items.map((i) => i.name)).not.toContain('Удалённая цель')
  })

  it('делит пункты на сделано/осталось и считает долю одного пункта', () => {
    const s = daySummary(settings, [water, pushups], byToday, '2026-09-30', plans, goals)
    expect(s.items.filter(isItemDone).map((i) => i.name).sort()).toEqual(['Вода', 'Позвонить', 'Цель'].sort())
    expect(s.items.filter((i) => !isItemDone(i)).map((i) => i.name).sort()).toEqual(['Отжимания', 'Уборка'].sort())
    expect(s.total).toBe(5)
    expect(itemSharePct(s, 1)).toBe(20)
    expect(s.bonus).toEqual([
      { name: 'Бонус-план', date: undefined, done: true },
      { name: 'Бонус-невыполненный', date: undefined, done: false },
    ])
  })

  it('настройки: без метрик/без планов пункты не попадают; без пунктов itemPct=0', () => {
    const onlyPlans = daySummary({ ...settings, includeMetrics: false }, [water], { w: true }, '2026-09-30', plans, goals)
    expect(onlyPlans.items.every((i) => i.kind === 'plan')).toBe(true)
    const none = daySummary({ ...settings, includeMetrics: false, includePlanned: false }, [water], {}, '2026-09-30', [], goals)
    expect(none.total).toBe(0)
    expect(none.itemPct).toBe(0)
    expect(none.totalPct).toBe(0)
  })
})

describe('weekSummary согласован с computeWeekProgressPure', () => {
  const weekly = metric({ id: 'k', name: 'Бег', schedule: { type: 'weekly', min: 3 } as any })
  const atMost = metric({ id: 'a', name: 'Сладкое', schedule: { type: 'at_most', max: 1 } as any })
  const metrics = [water, weekly, atMost]
  const dates = ['2026-09-28', '2026-09-29', '2026-09-30']
  const values = {
    '2026-09-28': { w: true, k: true, a: true },
    '2026-09-29': { w: false, k: true, a: true },
    '2026-09-30': { w: true, k: false, a: false },
  }
  const plannedByDate = { '2026-09-28': [{ text: 'План', done: true }], '2026-09-29': [{ text: 'Бонус', done: true, bonus: true }], '2026-09-30': [] }

  it('делает те же total/done/bonus, что кольцо недели («N раз в неделю» = N пунктов, «не чаще N» = 1)', () => {
    const ring = computeWeekProgressPure(settings, metrics, values, dates, plannedByDate, goals)!
    const s = weekSummary(settings, metrics, values, dates, plannedByDate, goals)
    expect(s.total).toBe(ring.total)
    expect(s.done).toBe(ring.done)
    expect(s.bonusPct).toBe(ring.bonusPct)
    expect(s.totalPct).toBe(progressPercent(ring))
  })

  it('«N раз в неделю» показывает прогресс 2/3, «не чаще N» — превышение лимита; у дневных пунктов есть дата', () => {
    const s = weekSummary(settings, metrics, values, dates, plannedByDate, goals)
    const run = s.items.find((i) => i.name === 'Бег')!
    expect(run).toMatchObject({ weight: 3, doneWeight: 2, note: '2/3' })
    expect(isItemDone(run)).toBe(false)
    const sweets = s.items.find((i) => i.name === 'Сладкое')!
    expect(sweets.doneWeight).toBe(0) // сделано 2 раза при лимите 1
    expect(sweets.note).toBe('2/≤1')
    const mondayWater = s.items.find((i) => i.name === 'Вода' && i.date === '2026-09-28')!
    expect(isItemDone(mondayWater)).toBe(true)
  })
})
