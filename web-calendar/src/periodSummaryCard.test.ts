import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PeriodSummaryCard from './components/PeriodSummaryCard.vue'
import { defaultShow, parseShow, serializeShow } from './lib/calendarShow'
import { addDaysIso } from './lib/date'
import type { HistoryContext } from './lib/historyStats'
import type { Metric, MetricValue } from './lib/historyTypes'

// BACKLOG 73.1: карточка «Сводка за период» — переключатель периода, состояния «мало данных / нет прошлого», плитки, группы и таблица.
const water: Metric = { id: 'W', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000 }
function days(a: string, b: string, v: (d: string) => number) {
  const o: Record<string, Record<string, MetricValue>> = {}
  for (let d = a; d <= b; d = addDaysIso(d, 1)) o[d] = { W: v(d) }
  return o
}
function ctxOf(byDate: HistoryContext['byDate'], firstDate = '2026-08-01'): HistoryContext {
  return { metrics: [water], byDate, notesByDate: {}, goals: [], settings: { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' }, firstDate, today: '2026-10-28' }
}
const mountCard = (ctx: HistoryContext) => mount(PeriodSummaryCard, { props: { ctx } })

describe('карточка «Сводка за период»', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('по умолчанию «Месяц» текущего месяца; «›» заблокирована, «‹» листает назад', async () => {
    const w = mountCard(ctxOf(days('2026-09-01', '2026-10-28', () => 2500)))
    expect(w.find('[data-test="sum-kind-month"]').attributes('aria-pressed')).toBe('true')
    const title = w.find('[data-test="sum-title"]').text()
    expect(title).toContain('2026')
    expect(w.find('[data-test="sum-next"]').attributes('disabled')).toBeDefined()
    await w.find('[data-test="sum-prev"]').trigger('click')
    expect(w.find('[data-test="sum-title"]').text()).not.toBe(title)
    expect(w.find('[data-test="sum-next"]').attributes('disabled')).toBeUndefined()
  })

  it('смена периода сбрасывает сдвиг; год показывает 2026', async () => {
    const w = mountCard(ctxOf(days('2026-09-01', '2026-10-28', () => 2500)))
    await w.find('[data-test="sum-prev"]').trigger('click')
    await w.find('[data-test="sum-kind-year"]').trigger('click')
    expect(w.find('[data-test="sum-title"]').text()).toBe('2026')
  })

  it('мало данных: меньше 3 дней — заметка и ни одной плитки', () => {
    const w = mountCard(ctxOf(days('2026-10-27', '2026-10-28', () => 2500)))
    expect(w.find('[data-test="sum-note"]').text()).toContain('2')
    expect(w.find('[data-test="sum-tiles"]').exists()).toBe(false)
  })

  it('нет прошлого периода: плитки есть, без сравнения; пояснение «сравнивать не с чем»', () => {
    const w = mountCard(ctxOf(days('2026-10-01', '2026-10-28', () => 2500), '2026-10-01'))
    expect(w.find('[data-test="sum-tiles"]').exists()).toBe(true)
    expect(w.find('[data-test="sum-tile-avg"]').text()).toContain('100%')
    for (const k of ['avg', 'perfect', 'workouts', 'goals']) expect(w.find(`[data-test="sum-tile-${k}"]`).text(), k).not.toContain('прошлому')
    expect(w.find('[data-test="sum-note"]').text()).toContain('прошлом периоде')
    expect(w.find('[data-test="sum-table-toggle"]').exists()).toBe(false)
  })

  it('есть сравнение: «стало лучше» со стрелкой и знаком, таблица «Все метрики» раскрывается', async () => {
    const byDate = { ...days('2026-09-01', '2026-09-30', (d) => (d <= '2026-09-10' ? 2500 : 500)), ...days('2026-10-01', '2026-10-28', () => 2500) }
    const w = mountCard(ctxOf(byDate))
    const g = w.find('[data-test="sum-group-better"]')
    expect(g.exists()).toBe(true)
    expect(g.text()).toContain('Вода')
    expect(g.text()).toMatch(/▲ \+\d+/)
    expect(w.find('[data-test="sum-group-worse"]').exists()).toBe(false)
    expect(w.find('[data-test="sum-story"]').text()).toContain('Лучше всего: Вода')
    for (const k of ['avg', 'perfect', 'workouts', 'goals']) expect(w.find(`[data-test="sum-tile-${k}"]`).text(), k).toContain('к прошлому периоду')
    expect(w.find('[data-test="sum-table"]').exists()).toBe(false)
    await w.find('[data-test="sum-table-toggle"]').trigger('click')
    expect(w.find('[data-test="sum-table"]').text()).toContain('Вода')
  })
})

describe('«Показывать»: часть summary', () => {
  it('по умолчанию включена; выключенная пишется в хранилище и читается обратно', () => {
    expect(defaultShow().summary).toBe(true)
    const off = { ...defaultShow(), summary: false }
    expect(serializeShow(off)).toBe('{"summary":false}')
    expect(parseShow('{"summary":false}').summary).toBe(false)
  })
})
