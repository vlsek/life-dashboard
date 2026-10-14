import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { monthGoalsFor, type PlanGoal, type PlannedEntry } from './lib/planned'

// BACKLOG 1052 «Цели недели и месяца на главной» (срез 1 — месяц, срез 2 — неделя, миграция 086): активные цели с горизонтом «В ближайший месяц», которых нет в плане, — под таблицей «Планов» (только сегодня).
const g = (id: string, name: string, o: Partial<PlanGoal> = {}): PlanGoal => ({ id, name, stages: 1, done: false, current_stage: 0, ...o })
const ids = (...x: string[]) => new Set(x)
const TODAY = '2026-10-13'

describe('monthGoalsFor', () => {
  const goals = [g('1', 'Книга'), g('2', 'Бег'), g('3', 'Сделано', { done: true }), g('4', 'Чужая')]
  it('только цели месяца: не выполненные и не стоящие в плане', () => {
    const planned: PlannedEntry[] = [{ type: 'goal', text: 'Бег' }]
    expect(monthGoalsFor(goals, ids('1', '2', '3'), planned, TODAY, TODAY).map((x) => x.name)).toEqual(['Книга'])
  })
  it('пункт-«свой» с тем же текстом цель не прячет; пункт-цель — прячет', () => {
    expect(monthGoalsFor(goals, ids('1'), [{ type: 'custom', text: 'Книга' } as PlannedEntry], TODAY, TODAY)).toHaveLength(1)
    expect(monthGoalsFor(goals, ids('1'), [{ type: 'goal', text: 'Книга' }], TODAY, TODAY)).toHaveLength(0)
  })
  it('не сегодня — пусто; без колонки (нет id) — пусто', () => {
    expect(monthGoalsFor(goals, ids('1'), [], '2026-10-12', TODAY)).toEqual([])
    expect(monthGoalsFor(goals, ids(), [], TODAY, TODAY)).toEqual([])
  })
})

const h = vi.hoisted(() => ({ horizonsAsked: [] as unknown[], monthRows: [] as { id: string }[], monthError: null as null | { message: string }, weekRows: [] as { id: string }[], weekError: null as null | { message: string }, goalUpdates: [] as Record<string, unknown>[], today: '' }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const f: Record<string, unknown> = {}
      const chain: any = {
        select: (c?: string) => ((f.cols = c ?? ''), chain),
        eq: (k: string, v: unknown) => ((f[k] = v), chain),
        order: () => chain,
        gte: () => chain,
        lt: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => {
          if (table === 'goals' && (f.horizon === 'month' || f.horizon === 'week')) {
            h.horizonsAsked.push(f.horizon)
            if (f.horizon === 'week') return Promise.resolve(h.weekError ? { data: null, error: h.weekError } : { data: h.weekRows, error: null }).then(res)
            return Promise.resolve(h.monthError ? { data: null, error: h.monthError } : { data: h.monthRows, error: null }).then(res)
          }
          if (table === 'goals')
            return Promise.resolve({
              data: [
                { id: 'a', name: 'Прочитать книгу', stages: 1, done: false, current_stage: 0, done_date: null },
                { id: 'b', name: 'Большой проект', stages: 4, done: false, current_stage: 1, done_date: null },
                { id: 'c', name: 'Обычная цель', stages: 1, done: false, current_stage: 0, done_date: null },
              ],
              error: null,
            }).then(res)
          return Promise.resolve({ data: [], error: null }).then(res)
        },
        upsert: () => Promise.resolve({ error: null }),
        update: (p: Record<string, unknown>) => (h.goalUpdates.push(p), { eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'
import { todayStr } from './lib/date'

beforeEach(() => {
  h.monthRows = [{ id: 'a' }, { id: 'b' }]
  h.horizonsAsked = []
  h.weekRows = []
  h.weekError = null
  h.monthError = null
  h.goalUpdates = []
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})
const mountPlanned = async (date?: string) => {
  const w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
  await flushPromises()
  return w
}

describe('«Планы»: блок «Цели месяца»', () => {
  it('сегодня: цели месяца показаны, обычная цель — нет; одноэтапная с галочкой, многоэтапная «этап/этапов»', async () => {
    const w = await mountPlanned()
    const rows = w.findAll('[data-test="month-goal"]')
    expect(rows.map((r) => r.text())).toEqual(['Прочитать книгу', '1/4Большой проект'])
    expect(rows[0].find('[data-test="month-goal-check"]').exists()).toBe(true)
    expect(rows[1].find('[data-test="month-goal-check"]').exists()).toBe(false)
    w.unmount()
  })
  it('спрашиваются цели недели и месяца (миграции 086/084)', async () => {
    const w = await mountPlanned()
    expect([...h.horizonsAsked].sort()).toEqual(['month', 'week'])
    w.unmount()
  })
  it('цели недели (086) тоже показываются; нет миграции 086 (ошибка запроса недели) — остаются цели месяца', async () => {
    h.monthRows = [{ id: 'a' }]
    h.weekRows = [{ id: 'c' }]
    const w1 = await mountPlanned()
    expect(w1.findAll('[data-test="month-goal"]').map((r) => r.text())).toEqual(['Прочитать книгу', 'Обычная цель'])
    w1.unmount()
    h.weekError = { message: 'column goals.horizon does not exist or check' }
    const w2 = await mountPlanned()
    expect(w2.findAll('[data-test="month-goal"]').map((r) => r.text())).toEqual(['Прочитать книгу'])
    w2.unmount()
  })
  it('отметка пишется в саму цель и убирает её из списка месяца', async () => {
    const w = await mountPlanned()
    await w.find('[data-test="month-goal-check"]').setValue(true)
    await flushPromises()
    expect(h.goalUpdates.at(-1)).toMatchObject({ done: true, done_date: todayStr() })
    expect(w.findAll('[data-test="month-goal"]').map((r) => r.text())).toEqual(['1/4Большой проект'])
    w.unmount()
  })
  it('другой день и ошибка запроса (нет колонки горизонта) — блока нет, остальное работает', async () => {
    const w1 = await mountPlanned('2026-01-01')
    expect(w1.find('[data-test="month-goals"]').exists()).toBe(false)
    w1.unmount()
    h.monthError = { message: 'column goals.horizon does not exist' }
    const w2 = await mountPlanned()
    expect(w2.find('[data-test="month-goals"]').exists()).toBe(false)
    expect(w2.find('[data-test="planned"]').exists()).toBe(true)
    w2.unmount()
  })
})
