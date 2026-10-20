import { beforeEach, describe, expect, it, vi } from 'vitest'
import appSource from './App.vue?raw'

// BACKLOG 44.8, срез 4: запрос карточки «Сегодня» — свой, не зависит от листаемого месяца; ошибка чтения прячет карточку, но не ломает страницу.
const h = vi.hoisted(() => ({ note: null as unknown, goals: [] as unknown[], noteErr: false, goalsErr: false, calls: [] as { table: string; ops: unknown[][] }[] }))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const rec = { table, ops: [] as unknown[][] }
    h.calls.push(rec)
    const c: Record<string, unknown> = {}
    for (const k of ['select', 'eq', 'not', 'lte', 'gte']) c[k] = (...a: unknown[]) => (rec.ops.push([k, ...a]), c)
    c.maybeSingle = () => Promise.resolve({ data: h.note, error: h.noteErr ? { message: 'x' } : null })
    c.then = (res: (v: unknown) => unknown) => Promise.resolve(table === 'goals' ? { data: h.goals, error: h.goalsErr ? { message: 'y' } : null } : { data: [], error: null }).then(res)
    return c
  }
  return { sb: { from: chain, auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }
})
import { useCalendar } from './lib/useCalendar'

beforeEach(() => {
  h.note = null
  h.goals = []
  h.noteErr = false
  h.goalsErr = false
  h.calls = []
})

describe('loadToday', () => {
  it('планы дня и сроки собираются в сводку; запрос — за сегодня и за горизонт, только невыполненные со сроком', async () => {
    h.note = { planned_goals: [{ type: 'custom', text: 'А', done: true }, 'старая строка'] }
    h.goals = [{ id: 'g1', name: 'Сдать', done: false, deadline: '2026-10-22' }]
    const c = useCalendar()
    await c.loadToday('u1', '2026-10-20')
    expect(c.today.value).toMatchObject({ plannedTotal: 2, plannedDone: 1 })
    expect(c.today.value!.upcoming.map((g) => g.id)).toEqual(['g1'])
    const goals = h.calls.find((x) => x.table === 'goals')!.ops
    expect(goals).toContainEqual(['eq', 'done', false])
    expect(goals).toContainEqual(['lte', 'deadline', '2026-11-03'])
    expect(h.calls.find((x) => x.table === 'daily_notes')!.ops).toContainEqual(['eq', 'date', '2026-10-20'])
  })
  it('нет записи дня — пустые планы, сроки остаются', async () => {
    h.goals = [{ id: 'g1', name: 'Сдать', done: false, deadline: '2026-10-19' }]
    const c = useCalendar()
    await c.loadToday('u1', '2026-10-20')
    expect(c.today.value).toMatchObject({ plannedTotal: 0 })
    expect(c.today.value!.upcoming[0].kind).toBe('overdue')
  })
  it('ошибка чтения заметки или целей — карточки нет (null), без исключения', async () => {
    const c = useCalendar()
    h.noteErr = true
    await c.loadToday('u1', '2026-10-20')
    expect(c.today.value).toBeNull()
    h.noteErr = false
    h.goalsErr = true
    await c.loadToday('u1', '2026-10-20')
    expect(c.today.value).toBeNull()
  })
})

describe('страница', () => {
  it('карточка стоит над сеткой, прячется настройкой, открывает день и обновляется после сохранения дня', () => {
    expect(appSource).toContain('<TodayCard v-if="show.today && today"')
    expect(appSource.indexOf('<TodayCard')).toBeLessThan(appSource.indexOf('<HistoryView ref="grid"'))
    expect(appSource).toContain('@open="openDay"')
    expect(appSource).toMatch(/await savePlanned[\s\S]*?await reloadToday\(\)/)
    expect(appSource).toContain('Promise.all([reloadMonth(), reloadToday()])')
  })
})
