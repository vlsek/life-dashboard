import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 76.1: «события жизни» — точки в сетке месяца и список в окне дня; чтение чужих разделов не ломает календарь.
const h = vi.hoisted(() => ({
  data: {} as Record<string, unknown[]>,
  errors: new Set<string>(),
  calls: [] as { table: string; ops: unknown[][] }[],
}))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const rec = { table, ops: [] as unknown[][] }
    h.calls.push(rec)
    const c: Record<string, unknown> = {}
    for (const k of ['select', 'eq', 'not', 'lte', 'gte', 'in']) c[k] = (...a: unknown[]) => (rec.ops.push([k, ...a]), c)
    c.then = (res: (v: unknown) => unknown) => Promise.resolve(h.errors.has(table) ? { data: null, error: { message: 'x' } } : { data: h.data[table] ?? [], error: null }).then(res)
    return c
  }
  return { sb: { from: chain, auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }
})
vi.mock('./lib/useHistoryData', () => ({
  useAuthAndData: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'u@example.com' }),
    ctx: ref({ today: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`, firstDate: '2020-01-01' }),
    error: ref(null),
  }),
}))
vi.mock('./lib/historyStats', () => ({
  hasData: () => true,
  dayStats: () => ({ pct: 40, total: 2, bonusPct: 0 }),
  weekStats: () => ({ pct: 70, total: 5, bonusPct: 0 }),
}))
vi.mock('./components/PeriodSummaryCard.vue', () => ({ default: { template: '<div />', props: ['ctx'] } }))
vi.mock('./components/DayDetailModal.vue', () => ({ default: { template: '<div />', props: ['ctx', 'dateStr'] } }))
vi.mock('./components/MonthCategoryChart.vue', () => ({ default: { template: '<div />', props: ['ctx', 'year', 'month'] } }))

import { useCalendar } from './lib/useCalendar'
import { defaultShow } from './lib/calendarShow'
import HistoryView from './components/HistoryView.vue'
import DayModal from './components/DayModal.vue'
import type { LifeEvents } from './lib/lifeEvents'

const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const day = (d: number) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(d)}`

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.data = {}
  h.errors = new Set()
  h.calls = []
})

describe('useCalendar.loadMonth: события жизни', () => {
  it('собирает тренировки, дни челленджей и сроки вех; запросы ограничены месяцем', async () => {
    h.data = {
      workout_entries: [{ date: '2026-10-05' }, { date: '2026-10-05' }],
      challenge_entries: [{ date: '2026-10-05', challenge_id: 'c1' }],
      challenge_instances: [{ id: 'c1', title: 'Отжимания', start_date: '2026-10-01' }],
      milestones: [{ id: 'm1', name: 'Марафон', due_date: '2026-10-20' }],
    }
    const c = useCalendar()
    await c.loadMonth('u1', 2026, 9)
    expect(c.events.value['2026-10-05']).toEqual({ workouts: 2, challenges: [{ id: 'c1', title: 'Отжимания', day: 5 }], milestones: [] })
    expect(c.events.value['2026-10-20'].milestones).toEqual([{ id: 'm1', name: 'Марафон' }])
    const w = h.calls.find((x) => x.table === 'workout_entries')!.ops
    expect(w).toContainEqual(['gte', 'date', '2026-10-01'])
    expect(w).toContainEqual(['lte', 'date', '2026-10-31'])
    expect(h.calls.find((x) => x.table === 'challenge_instances')!.ops).toContainEqual(['in', 'id', ['c1']])
  })
  it('без записей челленджей запрос экземпляров не делается', async () => {
    const c = useCalendar()
    await c.loadMonth('u1', 2026, 9)
    expect(h.calls.some((x) => x.table === 'challenge_instances')).toBe(false)
    expect(c.events.value).toEqual({})
  })
  it('ошибка чтения одного раздела убирает только его точки; планы и ошибка календаря не затронуты', async () => {
    h.errors.add('workout_entries')
    h.data = { milestones: [{ id: 'm1', name: 'Марафон', due_date: '2026-10-20' }], workout_entries: [{ date: '2026-10-05' }] }
    const c = useCalendar()
    await c.loadMonth('u1', 2026, 9)
    expect(c.events.value['2026-10-05']).toBeUndefined()
    expect(c.events.value['2026-10-20'].milestones).toHaveLength(1)
    expect(c.error.value).toBeNull()
  })
})

const ev: Record<string, LifeEvents> = {
  [day(3)]: { workouts: 2, challenges: [], milestones: [] },
  [day(4)]: { workouts: 0, challenges: [{ id: 'c', title: 'Отжимания', day: 4 }], milestones: [{ id: 'm', name: 'Марафон' }] },
}

describe('сетка месяца: точки событий', () => {
  const grid = (show = defaultShow()) => mount(HistoryView, { props: { mode: 'calendar', events: ev, show } as never, attachTo: document.body })
  it('в клетках — точки нужных видов', async () => {
    const w = grid()
    await flushPromises()
    expect(w.findAll('[data-test="cal-events"]')).toHaveLength(2)
    expect(w.findAll('[data-test="cal-dot-workout"]')).toHaveLength(1)
    expect(w.findAll('[data-test="cal-dot-challenge"]')).toHaveLength(1)
    expect(w.findAll('[data-test="cal-dot-milestone"]')).toHaveLength(1)
    w.unmount()
  })
  it('«События жизни» выключены — точек нет, сетка остаётся', async () => {
    const w = grid({ ...defaultShow(), events: false })
    await flushPromises()
    expect(w.find('[data-test="cal-events"]').exists()).toBe(false)
    expect(w.findAll('[data-test="calendar-grid"] button').length + w.findAll('button').length).toBeGreaterThan(20)
    w.unmount()
  })
  it('в режиме истории точек нет', async () => {
    const w = mount(HistoryView, { props: { mode: 'history', events: ev } as never, attachTo: document.body })
    await flushPromises()
    expect(w.find('[data-test="cal-events"]').exists()).toBe(false)
    w.unmount()
  })
})

describe('окно дня: список событий', () => {
  it('показывает тренировку, день челленджа и срок вехи', () => {
    const w = mount(DayModal, { props: { dateStr: day(4), initial: [], events: { workouts: 3, challenges: [{ id: 'c', title: 'Отжимания', day: 4 }], milestones: [{ id: 'm', name: 'Марафон' }] } } })
    expect(w.find('[data-test="day-event-workout"]').text()).toContain('3')
    expect(w.find('[data-test="day-event-challenge"]').text()).toContain('Отжимания')
    expect(w.find('[data-test="day-event-challenge"]').text()).toContain('4')
    expect(w.find('[data-test="day-event-milestone"]').text()).toContain('Марафон')
    w.unmount()
  })
  it('без событий блока нет', () => {
    const w = mount(DayModal, { props: { dateStr: day(4), initial: [], events: null } })
    expect(w.find('[data-test="day-events"]').exists()).toBe(false)
    w.unmount()
  })
})
