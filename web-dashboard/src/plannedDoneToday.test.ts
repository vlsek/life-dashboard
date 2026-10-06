import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { doneOnDay, type PlanGoal, type PlannedEntry } from './lib/planned'
import { todayStr } from './lib/date'

// BACKLOG 1078: «на главной пусть показываются цели, выполненные сегодня из целей» — выполненные в этот день цели,
// которых не было в плане, больше не пропадают с главной.
const g = (o: Partial<PlanGoal> & { id: string; name: string }): PlanGoal => ({ stages: 1, done: false, current_stage: 0, done_date: null, ...o })
const goalItem = (text: string): PlannedEntry => ({ type: 'goal', text } as PlannedEntry)

describe('doneOnDay', () => {
  const goals = [
    g({ id: '1', name: 'Бег', done: true, done_date: '2026-10-06' }),
    g({ id: '2', name: 'Вчера', done: true, done_date: '2026-10-05' }),
    g({ id: '3', name: 'Не сделана', done: false, done_date: '2026-10-06' }),
    g({ id: '4', name: 'Уже в плане', done: true, done_date: '2026-10-06' }),
    g({ id: '5', name: 'Без даты', done: true, done_date: null }),
    g({ id: '6', name: 'Этапы', stages: 3, current_stage: 3, done: true, done_date: '2026-10-06' }),
  ]
  it('только выполненные именно в этот день и не стоящие в плане этого дня', () => {
    const r = doneOnDay(goals, [goalItem('Уже в плане')], '2026-10-06')
    expect(r.map((x) => x.name)).toEqual(['Бег', 'Этапы'])
  })
  it('обычный пункт плана с тем же текстом цель не скрывает (скрывают только пункты-цели)', () => {
    const custom = { type: 'custom', text: 'Бег' } as PlannedEntry
    expect(doneOnDay(goals, [custom], '2026-10-06').map((x) => x.name)).toContain('Бег')
  })
  it('другой день — другой список; пусто, если нечего показывать', () => {
    expect(doneOnDay(goals, [], '2026-10-05').map((x) => x.name)).toEqual(['Вчера'])
    expect(doneOnDay(goals, [], '2026-01-01')).toEqual([])
  })
})

const h = vi.hoisted(() => ({ noteData: null as any, goalsData: [] as any[], selects: [] as string[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: (cols: string) => (table === 'goals' && h.selects.push(cols), chain),
        eq: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'goals' ? h.goalsData : [], error: null }).then(res),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import PlannedSection from './components/PlannedSection.vue'

let w: VueWrapper | null = null
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.noteData = null
  h.goalsData = []
  h.selects = []
})
afterEach(() => {
  w?.unmount()
  w = null
  document.body.innerHTML = ''
})
async function mountSection(date?: string) {
  w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
  await flushPromises()
}
const rows = () => [...document.body.querySelectorAll('[data-test="done-goal"]')].map((e) => e.textContent?.replace('✓', '').trim())

describe('PlannedSection: блок «цели, выполненные в этот день»', () => {
  it('запрос целей берёт done_date', async () => {
    await mountSection()
    expect(h.selects.some((s) => s.includes('done_date'))).toBe(true)
  })
  it('сегодня: выполненная сегодня цель вне плана показана, вчерашняя и невыполненная — нет', async () => {
    const today = todayStr()
    h.goalsData = [
      { id: 'a', name: 'Сделана сегодня', stages: 1, done: true, current_stage: 0, done_date: today },
      { id: 'b', name: 'Сделана давно', stages: 1, done: true, current_stage: 0, done_date: '2020-01-01' },
      { id: 'c', name: 'Ещё нет', stages: 1, done: false, current_stage: 0, done_date: null },
    ]
    await mountSection()
    expect(rows()).toEqual(['Сделана сегодня'])
  })
  it('цель, уже стоящая в плане, в блоке не дублируется', async () => {
    const today = todayStr()
    h.noteData = { planned_goals: [{ type: 'goal', text: 'В плане' }] }
    h.goalsData = [{ id: 'a', name: 'В плане', stages: 1, done: true, current_stage: 0, done_date: today }]
    await mountSection()
    expect(rows()).toEqual([])
    expect(document.body.querySelector('[data-test="done-goals"]')).toBeNull()
  })
  it('нет выполненных сегодня целей — блока нет', async () => {
    await mountSection()
    expect(document.body.querySelector('[data-test="done-goals"]')).toBeNull()
  })
})
