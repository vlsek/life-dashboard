import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { ALL_PARTS, defaultShow, loadShow, parseShow, saveShow, serializeShow, SHOW_KEY } from './lib/calendarShow'

// BACKLOG 44.8 срез 2: «Показывать …» — выключаемые части страницы «Календарь».
const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const day = (d: number) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(d)}`

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
vi.mock('./components/DayDetailModal.vue', () => ({ default: { template: '<div />', props: ['ctx', 'dateStr'] } }))
vi.mock('./components/MonthCategoryChart.vue', () => ({ default: { template: '<div data-test="month-chart" />', props: ['ctx', 'year', 'month'] } }))

import HistoryView from './components/HistoryView.vue'
import CalendarShowToggles from './components/CalendarShowToggles.vue'

const planned = { [day(5)]: [{ type: 'custom', text: 'a', done: true }] }
const deadlines = { [day(7)]: [{ id: 'g1', name: 'Цель', done: false }] }
const off = (...keys: (typeof ALL_PARTS)[number][]) => {
  const s = defaultShow()
  for (const k of keys) s[k] = false
  return s
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('хранение настройки', () => {
  it('по умолчанию видно всё; мусор и неизвестные ключи не ломают', () => {
    expect(parseShow(null)).toEqual(defaultShow())
    for (const bad of ['', '{', 'null', '[1]', '"x"', '{"plans":"no","zzz":false}']) expect(parseShow(bad)).toEqual(defaultShow())
    expect(parseShow('{"plans":false,"weeks":false,"stats":1}')).toEqual(off('plans', 'weeks'))
  })
  it('пишем только выключенное; всё включено — ключ удаляется', () => {
    expect(serializeShow(defaultShow())).toBeNull()
    expect(JSON.parse(serializeShow(off('chart', 'deadlines'))!)).toEqual({ deadlines: false, chart: false })
    saveShow(off('stats'))
    expect(localStorage.getItem(SHOW_KEY)).toBe('{"stats":false}')
    expect(loadShow()).toEqual(off('stats'))
    saveShow(defaultShow())
    expect(localStorage.getItem(SHOW_KEY)).toBeNull()
  })
})

describe('вкладка «Календарь»', () => {
  const cal = (show = defaultShow()) => mount(HistoryView, { props: { mode: 'calendar', planned, deadlines, show } as never, attachTo: document.body })
  it('планы и дедлайны выключаются по отдельности, сетка остаётся', async () => {
    let w = cal()
    await flushPromises()
    expect(w.find('[data-test="cal-badge"]').exists()).toBe(true)
    expect(w.find('[data-test="cal-deadline"]').exists()).toBe(true)
    w.unmount()
    w = cal(off('plans'))
    await flushPromises()
    expect(w.find('[data-test="cal-badge"]').exists()).toBe(false)
    expect(w.find('[data-test="cal-deadline"]').exists()).toBe(true)
    w.unmount()
    w = cal(off('deadlines'))
    await flushPromises()
    expect(w.find('[data-test="cal-badge"]').exists()).toBe(true)
    expect(w.find('[data-test="cal-deadline"]').exists()).toBe(false)
    w.unmount()
    w = cal(off('plans', 'deadlines'))
    await flushPromises()
    expect(w.find('[data-test="hist-grid"]').exists()).toBe(true)
    w.unmount()
  })
})

describe('вкладка «История»', () => {
  const his = (show = defaultShow()) => mount(HistoryView, { props: { mode: 'history', show } as never, attachTo: document.body })
  it('всё включено — как раньше: статистика, диаграмма, колонка недели, список недель, заливка с %', async () => {
    const w = his()
    await flushPromises()
    for (const t of ['hist-stats', 'month-chart', 'hist-weekcol']) expect(w.find(`[data-test="${t}"]`).exists(), t).toBe(true)
    expect(w.text()).toContain('40%')
    expect(w.text()).toContain('Недели')
    w.unmount()
  })
  it('каждая часть выключается отдельно', async () => {
    const cases: [Parameters<typeof off>[0], (w: ReturnType<typeof mount>) => boolean][] = [
      ['stats', (w) => w.find('[data-test="hist-stats"]').exists()],
      ['chart', (w) => w.find('[data-test="month-chart"]').exists()],
      ['weekcol', (w) => w.find('[data-test="hist-weekcol"]').exists()],
      ['weeks', (w) => w.text().includes('Недели')],
      ['progress', (w) => w.findAll('button[data-date]').some((b) => b.text().includes('%'))], // % в ячейках дней (а не плитка «среднее за месяц»)
    ]
    for (const [key, visible] of cases) {
      const w = his(off(key))
      await flushPromises()
      expect(visible(w), key).toBe(false)
      expect(w.find('[data-test="hist-grid"]').exists(), key).toBe(true)
      w.unmount()
    }
  })
  it('без колонки недели сетка на 7 колонок', async () => {
    const w = his(off('weekcol'))
    await flushPromises()
    const row = w.find('[data-test="hist-grid"] .grid.gap-1:nth-child(2)')
    expect((row.element as HTMLElement).style.gridTemplateColumns).toBe('repeat(7, minmax(0, 1fr))')
    w.unmount()
  })
})

describe('панель «Показывать»', () => {
  it('свёрнута; чипы вкладки; нажатие шлёт toggle; счётчик скрытого', async () => {
    const w = mount(CalendarShowToggles, { props: { view: 'history', show: off('stats', 'chart') } })
    expect(w.find('[data-test="cal-show-panel"]').exists()).toBe(false)
    expect(w.find('[data-test="cal-show-hidden"]').text()).toContain('2')
    await w.find('[data-test="cal-show-toggle"]').trigger('click')
    for (const k of ['progress', 'weekcol', 'stats', 'chart', 'weeks']) expect(w.find(`[data-test="cal-show-${k}"]`).exists(), k).toBe(true)
    expect(w.find('[data-test="cal-show-plans"]').exists()).toBe(false)
    expect(w.find('[data-test="cal-show-stats"]').attributes('aria-pressed')).toBe('false')
    expect(w.find('[data-test="cal-show-progress"]').attributes('aria-pressed')).toBe('true')
    await w.find('[data-test="cal-show-weeks"]').trigger('click')
    expect(w.emitted('toggle')).toEqual([['weeks']])
  })
  it('на вкладке «Календарь» — только планы и сроки целей', async () => {
    const w = mount(CalendarShowToggles, { props: { view: 'calendar', show: defaultShow() } })
    await w.find('[data-test="cal-show-toggle"]').trigger('click')
    expect(w.findAll('[data-test^="cal-show-"][aria-pressed]').map((b) => b.attributes('data-test'))).toEqual(['cal-show-plans', 'cal-show-deadlines'])
  })
})
