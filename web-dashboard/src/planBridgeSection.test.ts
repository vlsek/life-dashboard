import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { PLAN_SNAPSHOT, requestPlanMark, requestPlanSnapshot, type PlanSnapshot } from './lib/planBridge'
import { todayStr } from './lib/date'

// BACKLOG 75.2 срез 2: PlannedSection — единственный писатель плана; он публикует снимок невыполненных своих пунктов
// и принимает просьбу «отметить» от списка «Осталось на сегодня».
const h = vi.hoisted(() => ({ noteData: null as any, upserts: [] as any[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (row: unknown) => (h.upserts.push(row), Promise.resolve({ error: null })),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import PlannedSection from './components/PlannedSection.vue'

let w: VueWrapper | null = null
const snaps: PlanSnapshot[] = []
const onSnap = (e: Event) => snaps.push((e as CustomEvent<PlanSnapshot>).detail)
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.upserts = []
  snaps.length = 0
  h.noteData = {
    planned_goals: [
      { type: 'custom', text: 'Врач', time: '18:30' },
      { type: 'goal', text: 'Цель' },
      { type: 'custom', text: 'Хлеб', done: true },
      { type: 'custom', text: 'Позвонить' },
    ],
  }
  window.addEventListener(PLAN_SNAPSHOT, onSnap)
})
afterEach(() => {
  window.removeEventListener(PLAN_SNAPSHOT, onSnap)
  w?.unmount()
  w = null
  document.body.innerHTML = ''
})
async function mountSection() {
  w = mount(PlannedSection, { props: { userId: 'u1', date: todayStr() }, attachTo: document.body })
  await flushPromises()
}

describe('PlannedSection ↔ мост списка «Осталось на сегодня»', () => {
  it('после загрузки публикует снимок: только свои невыполненные пункты и индексы из полного плана', async () => {
    await mountSection()
    const last = snaps[snaps.length - 1]
    expect(last.date).toBe(todayStr())
    expect(last.items).toEqual([
      { index: 0, text: 'Врач', time: '18:30' },
      { index: 3, text: 'Позвонить', time: null },
    ])
  })

  it('по запросу публикует снимок повторно (блок метрик мог смонтироваться позже)', async () => {
    await mountSection()
    snaps.length = 0
    requestPlanSnapshot()
    expect(snaps).toHaveLength(1)
  })

  it('просьба отметить: пункт сохраняется выполненным, снимок обновляется без него', async () => {
    await mountSection()
    expect(requestPlanMark(todayStr(), 3, 'Позвонить')).toBe(true)
    await flushPromises()
    const saved = h.upserts[h.upserts.length - 1].planned_goals
    expect(saved[3]).toMatchObject({ text: 'Позвонить', done: true })
    expect(saved[0].done).toBeUndefined() // остальные пункты не тронуты
    expect(snaps[snaps.length - 1].items.map((i) => i.text)).toEqual(['Врач'])
  })

  it('устаревшая просьба (текст по индексу уже другой), пункт-цель и чужой день — не принимаются и ничего не пишут', async () => {
    await mountSection()
    expect(requestPlanMark(todayStr(), 3, 'Другое')).toBe(false)
    expect(requestPlanMark(todayStr(), 1, 'Цель')).toBe(false)
    expect(requestPlanMark('2020-01-01', 0, 'Врач')).toBe(false)
    expect(requestPlanMark(todayStr(), 2, 'Хлеб')).toBe(false) // уже выполнен
    await flushPromises()
    expect(h.upserts).toHaveLength(0)
  })

  it('после размонтирования блок на просьбы не отвечает', async () => {
    await mountSection()
    w?.unmount()
    w = null
    expect(requestPlanMark(todayStr(), 0, 'Врач')).toBe(false)
  })
})
