import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { PLAN_SNAPSHOT, planSnapshotOf, requestPlanMark, type PlanSnapshot } from './lib/planBridge'
import { remainingToday } from './lib/todayRemaining'
import TodayRemaining from './components/TodayRemaining.vue'
import { todayStr } from './lib/date'

// 75.2 срез 3: одноэтапные цели плана в списке «Осталось на сегодня»
const h = vi.hoisted(() => ({ planned: [] as any[], goals: [] as any[], goalUpdates: [] as { row: any; id: string }[], planUpserts: [] as any[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let horizon = false
      const chain: any = {
        select: () => chain,
        eq: (col: string) => ((col === 'horizon' && (horizon = true)), chain),
        gte: () => chain,
        lt: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? { planned_goals: h.planned } : null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'goals' && !horizon ? h.goals : [], error: null }).then(res),
        upsert: (row: unknown) => (h.planUpserts.push(row), Promise.resolve({ error: null })),
        update: (row: unknown) => ({ eq: (_c: string, id: string) => (h.goalUpdates.push({ row, id }), Promise.resolve({ error: null })) }),
      }
      return chain
    },
  },
}))
import PlannedSection from './components/PlannedSection.vue'

const TODAY = todayStr()
const goal = (o: Record<string, unknown> = {}) => ({ id: 'g1', name: 'Сдать отчёт', stages: 1, done: false, current_stage: 0, ...o })

describe('planSnapshotOf: цели', () => {
  const plan = [{ type: 'goal', text: 'Сдать отчёт' }, { type: 'goal', text: 'Выучить 4 темы' }, { type: 'goal', text: 'Удалена' }, { type: 'goal', text: 'Уже готово', time: '10:00' }, { type: 'custom', text: 'Хлеб' }]
  const goals = [goal(), goal({ id: 'g2', name: 'Выучить 4 темы', stages: 4, current_stage: 1 }), goal({ id: 'g4', name: 'Уже готово', done: true })]

  it('берём только одноэтапные невыполненные цели; многоэтапные, удалённые и выполненные — нет', () => {
    const snap = planSnapshotOf(TODAY, plan, goals as never)
    expect(snap.items).toEqual([{ index: 0, text: 'Сдать отчёт', time: null, goal: true }, { index: 4, text: 'Хлеб', time: null }])
  })
  it('без списка целей пункты-цели пропускаются, как в срезе 2', () => {
    expect(planSnapshotOf(TODAY, plan).items.map((i) => i.text)).toEqual(['Хлеб'])
  })
})

describe('remainingToday и TodayRemaining: цели', () => {
  it('цель — строка плана с пометкой planGoal, закрывается одним касанием', () => {
    const [r] = remainingToday([], {}, TODAY, [{ index: 2, text: 'Сдать отчёт', time: null, goal: true }])
    expect(r).toMatchObject({ kind: 'plan', planGoal: true, oneTap: true, planIndex: 2 })
  })
  it('в строке показывается метка «цель»; у обычного пункта её нет', () => {
    localStorage.setItem('site_lang', 'ru')
    const rows = remainingToday([], {}, TODAY, [{ index: 0, text: 'Сдать отчёт', time: null, goal: true }, { index: 1, text: 'Хлеб', time: null }])
    const w = mount(TodayRemaining, { props: { rows } })
    expect(w.findAll('[data-test="today-left-goal"]')).toHaveLength(1)
    expect(w.get('[data-test="today-left-goal"]').text()).toBe('цель')
  })
})

describe('PlannedSection ↔ мост: отметка цели', () => {
  let w: VueWrapper | null = null
  const snaps: PlanSnapshot[] = []
  const onSnap = (e: Event) => snaps.push((e as CustomEvent<PlanSnapshot>).detail)
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
    h.goalUpdates = []
    h.planUpserts = []
    snaps.length = 0
    h.planned = [{ type: 'goal', text: 'Сдать отчёт' }, { type: 'goal', text: 'Выучить 4 темы' }, { type: 'custom', text: 'Хлеб' }]
    h.goals = [goal(), goal({ id: 'g2', name: 'Выучить 4 темы', stages: 4, current_stage: 1 })]
    window.addEventListener(PLAN_SNAPSHOT, onSnap)
  })
  afterEach(() => {
    window.removeEventListener(PLAN_SNAPSHOT, onSnap)
    w?.unmount()
    w = null
    document.body.innerHTML = ''
  })
  async function mountSection() {
    w = mount(PlannedSection, { props: { userId: 'u1', date: TODAY }, attachTo: document.body })
    await flushPromises()
  }

  it('снимок после загрузки содержит одноэтапную цель и пункт, но не многоэтапную цель', async () => {
    await mountSection()
    expect(snaps[snaps.length - 1].items).toEqual([{ index: 0, text: 'Сдать отчёт', time: null, goal: true }, { index: 2, text: 'Хлеб', time: null }])
  })

  it('просьба отметить цель: цель закрывается в базе как чекбоксом, из снимка она исчезает', async () => {
    await mountSection()
    expect(requestPlanMark(TODAY, 0, 'Сдать отчёт', true)).toBe(true)
    await flushPromises()
    expect(h.goalUpdates).toEqual([{ row: { done: true, done_date: TODAY }, id: 'g1' }])
    expect(snaps[snaps.length - 1].items.map((i) => i.text)).toEqual(['Хлеб'])
  })

  it('без флага goal пункт-цель отметить нельзя (и наоборот — обычный пункт с флагом goal)', async () => {
    await mountSection()
    expect(requestPlanMark(TODAY, 0, 'Сдать отчёт')).toBe(false)
    expect(requestPlanMark(TODAY, 2, 'Хлеб', true)).toBe(false)
    await flushPromises()
    expect(h.goalUpdates).toHaveLength(0)
    expect(h.planUpserts).toHaveLength(0)
  })

  it('многоэтапная цель, устаревший текст, чужой день и уже выполненная цель — не принимаются', async () => {
    await mountSection()
    expect(requestPlanMark(TODAY, 1, 'Выучить 4 темы', true)).toBe(false) // многоэтапная
    expect(requestPlanMark(TODAY, 0, 'Другая цель', true)).toBe(false) // текст по индексу другой
    expect(requestPlanMark('2020-01-01', 0, 'Сдать отчёт', true)).toBe(false) // чужой день
    expect(requestPlanMark(TODAY, 0, 'Сдать отчёт', true)).toBe(true)
    await flushPromises()
    expect(requestPlanMark(TODAY, 0, 'Сдать отчёт', true)).toBe(false) // уже выполнена
    expect(h.goalUpdates).toHaveLength(1)
  })
})
