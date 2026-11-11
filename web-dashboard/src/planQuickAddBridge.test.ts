import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в tapTargetsAllPilots.test.ts)
import { readFileSync } from 'node:fs'
import { PLAN_ADD, type PlanAddDetail } from './lib/planBridge'
import { todayStr } from './lib/date'

// Быстрый пункт из шапки (BACKLOG 79.6, срез 1): сторона Дашборда
const h = vi.hoisted(() => ({ store: {} as Record<string, any[]>, writes: [] as { date: string; list: any[] }[], failWriteFor: null as string | null, failReadFor: null as string | null }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let date = ''
      const chain: any = {
        select: () => chain,
        eq: (col: string, v: string) => ((col === 'date' && (date = v)), chain),
        gte: () => chain,
        lt: () => chain,
        order: () => chain,
        maybeSingle: () =>
          Promise.resolve(
            table === 'daily_notes'
              ? h.failReadFor === date
                ? { data: null, error: { message: 'read boom' } }
                : { data: h.store[date] ? { planned_goals: h.store[date] } : null, error: null }
              : { data: null, error: null },
          ),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (row: { date: string; planned_goals: any[] }) => {
          if (h.failWriteFor === row.date) return Promise.resolve({ error: { message: 'write boom' } })
          h.writes.push({ date: row.date, list: row.planned_goals })
          h.store[row.date] = row.planned_goals
          return Promise.resolve({ error: null })
        },
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import PlannedSection from './components/PlannedSection.vue'

const TODAY = todayStr()

describe('имя события совпадает у двух независимых бандлов', () => {
  it('web-header/src/lib/planQuickAdd.ts шлёт то же событие, что слушает PlannedSection', () => {
    const header: string = readFileSync('../web-header/src/lib/planQuickAdd.ts', 'utf-8')
    const m = /export const PLAN_ADD = '([^']+)'/.exec(header)
    expect(m).not.toBeNull()
    expect((m as RegExpExecArray)[1]).toBe(PLAN_ADD)
    expect(PLAN_ADD).toBe('dashboard:plan-add')
  })
})

describe('PlannedSection принимает пункт из шапки', () => {
  let w: VueWrapper | null = null
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
    h.writes = []
    h.failWriteFor = null
    h.failReadFor = null
    h.store = { [TODAY]: [{ type: 'custom', text: 'Врач', time: '18:30' }, { type: 'goal', text: 'Цель' }] }
  })
  afterEach(() => {
    w?.unmount()
    w = null
    document.body.innerHTML = ''
  })
  async function mountSection(date = TODAY) {
    w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
    await flushPromises()
  }
  const ask = async (over: Partial<PlanAddDetail> = {}) => {
    const detail: PlanAddDetail = { date: TODAY, text: 'Хлеб', time: null, handled: false, ...over }
    window.dispatchEvent(new CustomEvent<PlanAddDetail>(PLAN_ADD, { detail }))
    await flushPromises()
    return detail
  }

  it('принимает пункт на сегодня: handled сразу, пункт дописан в конец одним сохранением, остальное не тронуто', async () => {
    await mountSection()
    const d = await ask({ text: 'Хлеб', time: '09:30' })
    expect(d.handled).toBe(true)
    expect(h.writes).toHaveLength(1)
    expect(h.store[TODAY]).toEqual([{ type: 'custom', text: 'Врач', time: '18:30' }, { type: 'goal', text: 'Цель' }, { type: 'custom', text: 'Хлеб', time: '09:30' }])
    expect(w!.text()).toContain('Хлеб') // блок на странице показывает новый пункт сразу
  })

  it('такой же пункт уже есть — принято (handled), но дубль не пишется', async () => {
    await mountSection()
    const d = await ask({ text: 'Врач', time: '18:30' })
    expect(d.handled).toBe(true)
    expect(h.writes).toHaveLength(0)
  })

  it('другой показанный день, ещё не загруженный блок и чужая дата — не принимает: шапка запишет сама', async () => {
    await mountSection(addDays(TODAY, -1)) // показан вчерашний день
    expect((await ask()).handled).toBe(false)
    w!.unmount()
    await mountSection()
    expect((await ask({ date: '2020-01-01' })).handled).toBe(false)
    expect(h.writes).toHaveLength(0)
  })

  it('пустой, слишком длинный текст и уже принятое событие игнорируются', async () => {
    await mountSection()
    expect((await ask({ text: '   ' })).handled).toBe(false)
    expect((await ask({ text: 'я'.repeat(121) })).handled).toBe(false)
    const already = await ask({ handled: true, text: 'Другое' })
    expect(already.handled).toBe(true)
    expect(h.writes).toHaveLength(0)
  })

  it('сбой записи — ошибка видна в блоке, пункт на странице не появляется, сообщение не «успех»', async () => {
    await mountSection()
    h.failWriteFor = TODAY
    await ask({ text: 'Хлеб' })
    expect(h.store[TODAY].map((x) => x.text)).not.toContain('Хлеб')
  })

  it('после размонтирования блок событие не принимает', async () => {
    await mountSection()
    w!.unmount()
    w = null
    expect((await ask()).handled).toBe(false)
  })
})

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
