import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { buildMarks, monthCells, monthRange } from './lib/useCalendarWidget'
import { hasWidgets, widgetsConfig, withWidgetConfig, type LayoutItem } from './lib/layout'
import { todayStr } from './lib/date'

// BACKLOG 940, часть 2: виджет «Календарь» на Дашборде (решение владельца 2026-10-06).
describe('buildMarks / monthCells / monthRange', () => {
  it('отметки плана и сроков целей по датам; выполненное отличается', () => {
    const m = buildMarks(
      [
        { date: '2026-10-05', planned_goals: [{ type: 'custom', text: 'a', done: true }, { type: 'custom', text: 'b', done: false }] },
        { date: '2026-10-06', planned_goals: [] },
        { date: '2026-10-07', planned_goals: ['старая строка'] },
      ],
      [
        { deadline: '2026-10-05', done: false },
        { deadline: '2026-10-05', done: true },
        { deadline: null, done: false },
      ],
    )
    expect(m['2026-10-05']).toEqual({ plan: 2, planDone: 1, deadlines: 2, deadlinesOpen: 1 })
    expect(m['2026-10-06']).toBeUndefined()
    expect(m['2026-10-07'].plan).toBe(1)
  })
  it('пустой/null вход — пустая карта', () => {
    expect(buildMarks(null, undefined)).toEqual({})
  })
  it('сетка месяца: октябрь 2026 начинается с четверга (3 пустых), 31 день, сегодняшний помечен', () => {
    const cells = monthCells(2026, 9, {}, '2026-10-06')
    expect(cells.filter((c) => c === null)).toHaveLength(3)
    expect(cells.filter(Boolean)).toHaveLength(31)
    expect(cells.find((c) => c?.isToday)?.dateStr).toBe('2026-10-06')
  })
  it('границы месяца для запроса', () => {
    expect(monthRange(2026, 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })
})

describe('layout: calendar в config виджетов', () => {
  const base: LayoutItem[] = [{ key: 'profile', visible: true }, { key: 'widgets', visible: false }]
  it('widgetsConfig принимает только calendar === true', () => {
    expect(widgetsConfig({ calendar: true })).toEqual({ calendar: true })
    expect(widgetsConfig({ calendar: 'yes' })).toBeUndefined()
    expect(widgetsConfig({ calendar: false })).toBeUndefined()
  })
  it('withWidgetConfig включает и выключает календарь, не трогая остальные виджеты; блок «Виджеты» становится видимым', () => {
    const on = withWidgetConfig(withWidgetConfig(base, { languages: 'all' }), { calendar: true })
    const w = on.find((i) => i.key === 'widgets')!
    expect(w.config).toEqual({ languages: 'all', calendar: true })
    expect(w.visible).toBe(true)
    expect(hasWidgets(w)).toBe(true)
    const off = withWidgetConfig(on, { calendar: false }).find((i) => i.key === 'widgets')!
    expect(off.config).toEqual({ languages: 'all' })
    const none = withWidgetConfig(withWidgetConfig(base, { calendar: true }), { calendar: false }).find((i) => i.key === 'widgets')!
    expect(none.config).toBeUndefined()
  })
})

const h = vi.hoisted(() => ({ notes: [] as any[], goals: [] as any[], ranges: [] as string[][] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const range: string[] = []
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: (_c: string, v: string) => (range.push(v), chain),
        lte: (_c: string, v: string) => (range.push(v), chain),
        then: (res: (v: unknown) => unknown) => {
          h.ranges.push(range)
          return Promise.resolve({ data: table === 'goals' ? h.goals : h.notes, error: null }).then(res)
        },
      }
      return chain
    },
  },
}))
import CalendarWidget from './components/CalendarWidget.vue'
import WidgetsSection from './components/WidgetsSection.vue'
import LayoutModal from './components/LayoutModal.vue'

let w: VueWrapper | null = null
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.notes = []
  h.goals = []
  h.ranges = []
})
afterEach(() => {
  w?.unmount()
  w = null
})

describe('CalendarWidget', () => {
  it('рисует месяц сразу, с отметками плана и срока цели в нужных днях', async () => {
    const today = todayStr()
    h.notes = [{ date: today, planned_goals: [{ type: 'custom', text: 'x', done: false }] }]
    h.goals = [{ deadline: today, done: false }]
    w = mount(CalendarWidget, { props: { userId: 'u1' } })
    await flushPromises()
    expect(w.find('[data-test="calendar-widget"]').exists()).toBe(true)
    const cell = w.find(`[data-date="${today}"]`)
    expect(cell.exists()).toBe(true)
    expect(cell.find('[data-test="calendar-plan"]').exists()).toBe(true)
    expect(cell.find('[data-test="calendar-deadline"]').exists()).toBe(true)
    expect(w.findAll('[data-test="calendar-plan"]')).toHaveLength(1)
    expect(w.find('[data-test="calendar-link"]').attributes('href')).toBe('/calendar/')
  })
  it('сообщает состояние ready наверх; стрелки листают месяц и перезапрашивают данные', async () => {
    w = mount(CalendarWidget, { props: { userId: 'u1' } })
    await flushPromises()
    expect(w.emitted('state')?.at(-1)).toEqual(['ready'])
    const first = w.find('[data-test="calendar-label"]').text()
    const before = h.ranges.length
    await w.find('[data-test="calendar-next"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="calendar-label"]').text()).not.toBe(first)
    expect(h.ranges.length).toBeGreaterThan(before)
    await w.find('[data-test="calendar-prev"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="calendar-label"]').text()).toBe(first)
  })
  it('все дела месяца выполнены — пустой кружок, не точка', async () => {
    const today = todayStr()
    h.notes = [{ date: today, planned_goals: [{ type: 'custom', text: 'x', done: true }] }]
    w = mount(CalendarWidget, { props: { userId: 'u1' } })
    await flushPromises()
    expect(w.find('[data-test="calendar-plan"]').text()).toBe('○')
  })
})

describe('WidgetsSection / LayoutModal', () => {
  it('блок «Виджеты» показывается, когда выбран только календарь', async () => {
    w = mount(WidgetsSection, { props: { userId: 'u1', config: { calendar: true } } })
    await flushPromises()
    expect(w.emitted('shown')?.at(-1)).toEqual([true])
    expect(w.find('[data-test="calendar-widget"]').exists()).toBe(true)
  })
  it('календарь не выбран — виджета нет', async () => {
    w = mount(WidgetsSection, { props: { userId: 'u1', config: {} } })
    await flushPromises()
    expect(w.find('[data-test="calendar-widget"]').exists()).toBe(false)
  })
  it('в окне раскладки галочка «Календарь» включает календарь и сохраняется в раскладке', async () => {
    const initial: LayoutItem[] = [{ key: 'profile', visible: true }, { key: 'charts', visible: true }, { key: 'daily', visible: true }, { key: 'widgets', visible: false }]
    w = mount(LayoutModal, { props: { initial }, attachTo: document.body })
    const box = w.find('[data-test="calendar-toggle"]')
    expect(box.exists()).toBe(true)
    await box.setValue(true)
    const save = [...document.body.querySelectorAll('button')].find((b) => /Сохранить|Save/.test(b.textContent || ''))
    ;(save as HTMLButtonElement).click()
    await flushPromises()
    const saved = (w.emitted('save')?.at(-1)?.[0] as LayoutItem[]).find((i) => i.key === 'widgets')!
    expect(saved.config).toEqual({ calendar: true })
    expect(saved.visible).toBe(true)
  })
})
