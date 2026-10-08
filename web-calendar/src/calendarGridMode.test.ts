import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 44.8 (просьба владельца 2026-10-07): вкладка «Календарь» рисует сетку «Истории» (HistoryView, mode="calendar") + бейджи планов и дедлайнов.
const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
const day = (d: number) => `${ym}-${pad(d)}`
const h = vi.hoisted(() => ({ hasData: false }))

vi.mock('./lib/useHistoryData', () => ({
  useAuthAndData: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'u@example.com' }),
    ctx: ref({ today: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`, firstDate: h.hasData ? '2020-01-01' : null }),
    error: ref(null),
  }),
}))
vi.mock('./lib/historyStats', () => ({
  hasData: () => h.hasData,
  dayStats: (_c: unknown, d: string) => (d.endsWith('-10') ? { pct: 120, total: 3, bonusPct: 0 } : { pct: 40, total: 2, bonusPct: 0 }),
  weekStats: () => ({ pct: 70, total: 5, bonusPct: 0 }),
}))
vi.mock('./components/DayDetailModal.vue', () => ({ default: { template: '<div data-test="detail-modal" />', props: ['ctx', 'dateStr'] } }))

import HistoryView from './components/HistoryView.vue'

const planned = { [day(5)]: [{ type: 'custom', text: 'a', done: true }, { type: 'custom', text: 'b', done: false }], [day(6)]: [{ type: 'custom', text: 'c', done: true }] }
const deadlines = { [day(7)]: [{ id: 'g1', name: 'Цель', done: false }, { id: 'g2', name: 'Цель 2', done: true }], [day(8)]: [{ id: 'g3', name: 'Готово', done: true }] }
const mountCal = (mode: 'calendar' | 'history' = 'calendar') =>
  mount(HistoryView, { props: { mode, planned, deadlines } as never, attachTo: document.body })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.hasData = false
})

describe('сетка в режиме «Календарь»', () => {
  it('нет данных истории — сетка всё равно есть (планировать можно с нуля); в «Истории» вместо неё «нет данных»', async () => {
    const cal = mountCal('calendar')
    await flushPromises()
    expect(cal.find('[data-test="hist-grid"]').exists()).toBe(true)
    expect(cal.text()).not.toContain('Пока нет данных')
    const his = mountCal('history')
    await flushPromises()
    expect(his.find('[data-test="hist-grid"]').exists()).toBe(false)
    cal.unmount()
    his.unmount()
  })

  it('бейджи: план «сделано/всего» или галочка, дедлайны с числом; закрытые дедлайны приглушены', async () => {
    const w = mountCal()
    await flushPromises()
    const cell = (d: number) => w.find(`[data-date="${day(d)}"]`)
    expect(cell(5).find('[data-test="cal-badge"]').text()).toBe('1/2')
    expect(cell(6).find('[data-test="cal-badge"]').text()).toBe('') // всё выполнено — только значок-галочка
    expect(cell(6).find('[data-test="cal-badge"] svg').exists()).toBe(true)
    expect(cell(7).find('[data-test="cal-deadline"]').text()).toBe('2')
    expect(cell(7).find('[data-test="cal-deadline"]').classes()).not.toContain('cal-deadline-done')
    expect(cell(8).find('[data-test="cal-deadline"]').classes()).toContain('cal-deadline-done')
    expect(cell(9).find('[data-test="cal-badge"]').exists()).toBe(false)
    w.unmount()
  })

  it('в «Истории» бейджей нет, даже если планы переданы', async () => {
    const w = mountCal('history')
    h.hasData = true
    await flushPromises()
    expect(w.find('[data-test="cal-badge"]').exists()).toBe(false)
    expect(w.find('[data-test="cal-deadline"]').exists()).toBe(false)
    w.unmount()
  })

  it('у дней с данными заливка и процент из «Истории»; колонка недели и статистика месяца на месте', async () => {
    h.hasData = true
    const w = mountCal()
    await flushPromises()
    const c10 = w.find(`[data-date="${day(10)}"]`)
    expect(c10.text()).toContain('120%')
    expect(c10.attributes('style')).toContain('linear-gradient')
    expect(w.text()).toContain('Нед.') // заголовок колонки недели
    expect(w.text()).toContain('70%') // процент недели
    w.unmount()
  })

  it('клик по дню отдаёт дату наверх (там откроется форма планов), итоги дня сами не открываются', async () => {
    const w = mountCal()
    await flushPromises()
    await w.find(`[data-date="${day(7)}"]`).trigger('click')
    expect(w.emitted('selectDay')?.[0]).toEqual([day(7)])
    expect(w.find('[data-test="detail-modal"]').exists()).toBe(false)
    w.unmount()
  })

  it('в «Истории» клик открывает итоги дня и ничего наверх не отдаёт', async () => {
    h.hasData = true
    const w = mountCal('history')
    await flushPromises()
    await w.find(`[data-date="${day(7)}"]`).trigger('click')
    expect(w.emitted('selectDay')).toBeUndefined()
    expect(w.find('[data-test="detail-modal"]').exists()).toBe(true)
    w.unmount()
  })

  it('в «Календаре» можно листать вперёд и месяц сообщается наверх; в «Истории» «›» заблокирована в текущем месяце', async () => {
    const w = mountCal()
    await flushPromises()
    const buttons = w.find('[data-test="hist-head"]').findAll('button')
    expect(buttons[1].attributes('disabled')).toBeUndefined()
    await buttons[1].trigger('click')
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    expect(w.emitted('monthChange')?.[0]).toEqual([next.getFullYear(), next.getMonth()])
    await buttons[0].trigger('click')
    await buttons[0].trigger('click')
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    expect(w.emitted('monthChange')?.[2]).toEqual([prev.getFullYear(), prev.getMonth()])
    h.hasData = true
    const his = mountCal('history')
    await flushPromises()
    expect(his.find('[data-test="hist-head"]').findAll('button')[1].attributes('disabled')).toBeDefined()
    w.unmount()
    his.unmount()
  })

  it('список последних недель и заголовок «Истории» — только во вкладке «История»', async () => {
    h.hasData = true
    const cal = mountCal('calendar')
    await flushPromises()
    expect(cal.find('h1').exists()).toBe(false)
    expect(cal.find('h2').exists()).toBe(false)
    const his = mountCal('history')
    await flushPromises()
    expect(his.find('h1').exists()).toBe(true)
    cal.unmount()
    his.unmount()
  })
})
