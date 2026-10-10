import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { HistoryContext } from './historyStats'
import type { Metric } from './historyTypes'
import { monthCategoryGroups } from './historyCategories'
import { donutArcs, groupPct } from './categoryDonut'
import MonthCategoryChart from '../components/MonthCategoryChart.vue'

// BACKLOG 656 (в): доли категорий метрик за месяц в «Истории».
const m = (id: string, category_id: string | null, extra: Partial<Metric> = {}): Metric => ({ id, name: id, icon: 'x', type: 'boolean', category_id, ...extra })
const base = { notesByDate: {}, goals: [], settings: { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' } } as const
const ctx = (over: Partial<HistoryContext> = {}): HistoryContext => ({
  ...base,
  metrics: [m('A', 'c1'), m('B', 'c1'), m('C', 'c2'), m('D', null)],
  byDate: { '2026-09-21': { A: true, B: false, C: true }, '2026-09-22': { A: true, B: true, C: false, D: true } },
  categories: { c1: 'Спорт', c2: 'Учёба' },
  firstDate: '2026-09-21',
  today: '2026-09-22',
  ...over,
} as HistoryContext)

describe('monthCategoryGroups', () => {
  it('считает метрико-дни по категориям: Спорт 3/4, Учёба 1/2, без категории 1/2', () => {
    const g = monthCategoryGroups(ctx(), ctx().categories!, 2026, 8)
    expect(g.map((x) => [x.kind, x.label, x.done, x.total])).toEqual([
      ['category', 'Спорт', 3, 4],
      ['category', 'Учёба', 1, 2],
      ['none', '', 1, 2],
    ])
    expect(groupPct(g[0])).toBe(75)
  })
  it('дни до первой записи, будущие и чужой месяц не считаются; пусто без firstDate', () => {
    expect(monthCategoryGroups(ctx(), ctx().categories!, 2026, 7)).toEqual([])
    expect(monthCategoryGroups(ctx({ firstDate: null }), {}, 2026, 8)).toEqual([])
    const g = monthCategoryGroups(ctx({ firstDate: '2026-09-22' }), ctx().categories!, 2026, 8)
    expect(g.reduce((s, x) => s + x.total, 0)).toBe(4) // только 22-е
  })
  it('метрика «не чаще N» не дневной пункт; без названий категорий всё в «Без категории»', () => {
    const c = ctx({ metrics: [m('A', 'c1'), m('E', 'c1', { schedule: { type: 'at_most', max: 2 } as never })] })
    expect(monthCategoryGroups(c, c.categories!, 2026, 8).reduce((s, x) => s + x.total, 0)).toBe(2) // только A за 2 дня
    const g = monthCategoryGroups(ctx(), {}, 2026, 8)
    expect(g.map((x) => x.kind)).toEqual(['none'])
  })
  it('дуги: сумма длин = окружность, закраска пропорциональна', () => {
    const arcs = donutArcs(monthCategoryGroups(ctx(), ctx().categories!, 2026, 8), 0)
    expect(arcs.reduce((s, a) => s + a.lenFrac, 0)).toBeCloseTo(1, 6)
    expect(arcs[0].doneFrac).toBeCloseTo(arcs[0].lenFrac * 0.75, 6)
  })
})

describe('MonthCategoryChart', () => {
  it('две и более группы — рисует кольцо и легенду; одна — ничего', () => {
    const w = mount(MonthCategoryChart, { props: { ctx: ctx(), year: 2026, month: 8 } })
    expect(w.find('[data-test="month-category-chart"]').exists()).toBe(true)
    const legend = w.findAll('[data-test="donut-legend"]').map((l) => l.text())
    expect(legend.slice(0, 2)).toEqual(['Спорт3/4 · 75%', 'Учёба1/2 · 50%'])
    expect(legend[2]).toMatch(/1\/2 · 50%$/) // подпись «Без категории» зависит от языка
    expect(w.findAll('[data-test="donut-fill"]').length).toBe(3)
    const one = mount(MonthCategoryChart, { props: { ctx: ctx({ metrics: [m('A', 'c1')] }), year: 2026, month: 8 } })
    expect(one.find('[data-test="month-category-chart"]').exists()).toBe(false)
  })
})
