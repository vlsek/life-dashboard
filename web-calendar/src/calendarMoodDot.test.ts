import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 75.3: оценка дня (1–5) — маленький кружок на ячейке «Календаря»; нет оценки — нет кружка.
const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const day = (d: number) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(d)}`
vi.mock('./lib/supabase', () => ({ sb: { from: () => ({}), auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }))
vi.mock('./lib/useHistoryData', () => ({
  useAuthAndData: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'u@example.com' }),
    ctx: ref({
      today: day(15),
      firstDate: '2020-01-01',
      notesByDate: { [day(3)]: { date: day(3), mood: 4, notes: null }, [day(4)]: { date: day(4), mood: null, notes: 'заметка' }, [day(5)]: { date: day(5), mood: 9, notes: null } },
    }),
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

import { defaultShow } from './lib/calendarShow'
import HistoryView from './components/HistoryView.vue'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('кружок оценки дня в календаре', () => {
  it('есть только у дней с оценкой 1–5', async () => {
    const w = mount(HistoryView, { props: { mode: 'calendar', show: defaultShow() } })
    await flushPromises()
    const cell = (d: number) => w.find(`[data-date="${day(d)}"]`)
    expect(cell(3).find('[data-test="cal-mood"]').text()).toBe('4')
    expect(cell(3).find('[data-test="cal-mood"]').classes()).toContain('cal-mood-4')
    expect(cell(4).find('[data-test="cal-mood"]').exists()).toBe(false) // только заметка
    expect(cell(5).find('[data-test="cal-mood"]').exists()).toBe(false) // мусорная оценка
    expect(cell(6).find('[data-test="cal-mood"]').exists()).toBe(false)
  })
  it('в режиме «История» кружка нет', async () => {
    const w = mount(HistoryView, { props: { mode: 'history' } })
    await flushPromises()
    expect(w.find('[data-test="cal-mood"]').exists()).toBe(false)
  })
})
