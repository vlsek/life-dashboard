import { describe, expect, it } from 'vitest'
import { arcHue, categoryGroups, donutArcs, groupPct } from './categoryDonut'
import { daySummary, type SummaryItem } from './progressSummary'

const m = (name: string, done: number, category?: string, weight = 1): SummaryItem => ({ kind: 'metric', name, weight, doneWeight: done, category })
const plan = (done: number): SummaryItem => ({ kind: 'plan', name: 'p', weight: 1, doneWeight: done })

describe('categoryGroups (BACKLOG 656 а)', () => {
  const items = [m('a', 1, 'Спорт'), m('b', 0, 'Спорт'), m('c', 1, 'Учёба'), m('d', 0), plan(1)]
  it('группирует по категории; без категории и планы — отдельные группы в конце', () => {
    const g = categoryGroups(items)
    expect(g.map((x) => [x.kind, x.label, x.done, x.total])).toEqual([
      ['category', 'Спорт', 1, 2],
      ['category', 'Учёба', 1, 1],
      ['none', '', 0, 1],
      ['plans', '', 1, 1],
    ])
  })
  it('процент группы и пустой ввод', () => {
    expect(groupPct(categoryGroups(items)[0])).toBe(50)
    expect(categoryGroups([])).toEqual([])
  })
  it('пункты с нулевым весом не считаются, выполненное не превышает вес', () => {
    const g = categoryGroups([m('x', 5, 'A'), m('y', 0, 'A', 0)])
    expect(g[0]).toMatchObject({ done: 1, total: 1 })
  })
})

describe('donutArcs', () => {
  it('длины дуг в сумме дают окружность (минус зазоры), закраска пропорциональна выполненному', () => {
    const groups = categoryGroups([m('a', 1, 'A'), m('b', 0, 'A'), m('c', 1, 'B'), m('d', 1, 'B')])
    const arcs = donutArcs(groups, 0)
    expect(arcs.reduce((s, a) => s + a.lenFrac, 0)).toBeCloseTo(1, 6)
    expect(arcs[0].lenFrac).toBeCloseTo(0.5, 6)
    expect(arcs[0].doneFrac).toBeCloseTo(0.25, 6) // половина дуги из половины окружности
    expect(arcs[1].doneFrac).toBeCloseTo(0.5, 6) // вся дуга выполнена
    expect(arcs[1].startFrac).toBeCloseTo(0.5, 6)
  })
  it('одна группа — без зазора; пусто — нет дуг; цвета различаются', () => {
    expect(donutArcs(categoryGroups([m('a', 1, 'A')]))[0].lenFrac).toBeCloseTo(1, 6)
    expect(donutArcs([])).toEqual([])
    expect(new Set([0, 1, 2, 3, 4, 5, 6, 7].map(arcHue)).size).toBe(8)
  })
})

describe('daySummary кладёт название категории в пункт', () => {
  it('метрика с category_id получает название, без — undefined', () => {
    const base = { type: 'boolean', goal_value: null, schedule: null, active: true } as any
    const metrics = [
      { ...base, id: '1', name: 'Бег', category_id: 'c1' },
      { ...base, id: '2', name: 'Чтение', category_id: null },
    ]
    const s = daySummary({ includeMetrics: true, includePlanned: true } as any, metrics as any, {}, '2026-10-10', [], [], { c1: 'Спорт' })
    expect(s.items.map((i) => i.category)).toEqual(['Спорт', undefined])
  })
})
