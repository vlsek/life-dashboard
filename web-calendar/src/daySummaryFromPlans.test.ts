import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import appSrc from './App.vue?raw'

// BACKLOG 44.8 срез 3: «Итоги дня» из формы планов — кнопка в окне дня «Календаря» открывает те же итоги, что клик по дню в «Истории», поверх формы.
const now = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const ym = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
const TODAY = `${ym}-15`

vi.mock('./lib/useHistoryData', () => ({
  useAuthAndData: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'u@example.com' }),
    ctx: ref({ today: TODAY, firstDate: `${ym}-03` }),
    error: ref(null),
  }),
}))
vi.mock('./lib/historyStats', () => ({
  hasData: (c: { firstDate: string | null; today: string }, d: string) => !!c.firstDate && d >= c.firstDate && d <= c.today,
  dayStats: () => ({ pct: 40, total: 2, bonusPct: 0 }),
  weekStats: () => ({ pct: 70, total: 5, bonusPct: 0 }),
}))
vi.mock('./components/PeriodSummaryCard.vue', () => ({ default: { template: '<div data-test="hist-summary-stub" />', props: ['ctx'] } })) // 73.1: сводка за период тут не проверяется (свои тесты: periodSummary.test.ts, periodSummaryCard.test.ts)
vi.mock('./components/DayDetailModal.vue', () => ({ default: { template: '<div data-test="detail-modal">{{ dateStr }}</div>', props: ['ctx', 'dateStr'] } }))
vi.mock('./components/MonthCategoryChart.vue', () => ({ default: { template: '<div />', props: ['ctx', 'year', 'month'] } }))

import HistoryView from './components/HistoryView.vue'
import DayModal from './components/DayModal.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
})

type Exposed = { hasSummary: (d: string) => boolean; openSummary: (d: string) => void }
const grid = async (mode: 'calendar' | 'history') => {
  const w = mount(HistoryView, { props: { mode } as never, attachTo: document.body })
  await flushPromises()
  return w
}

describe('сетка знает, у каких дней есть итоги', () => {
  it('итоги есть между первым днём данных и сегодня; до начала данных и в будущем — нет', async () => {
    const w = await grid('calendar')
    const vm = w.vm as unknown as Exposed
    expect(vm.hasSummary(`${ym}-03`)).toBe(true)
    expect(vm.hasSummary(TODAY)).toBe(true)
    expect(vm.hasSummary(`${ym}-02`)).toBe(false)
    expect(vm.hasSummary(`${ym}-16`)).toBe(false)
    w.unmount()
  })
  it('в «Календаре» итоги открываются поверх (окно уезжает в конец body), в «Истории» остаются на месте', async () => {
    const cal = await grid('calendar')
    ;(cal.vm as unknown as Exposed).openSummary(`${ym}-10`)
    await flushPromises()
    expect(cal.find('[data-test="detail-modal"]').exists()).toBe(false)
    expect(document.body.querySelector('[data-test="detail-modal"]')?.textContent).toBe(`${ym}-10`)
    cal.unmount()
    document.body.innerHTML = ''
    const his = await grid('history')
    ;(his.vm as unknown as Exposed).openSummary(`${ym}-10`)
    await flushPromises()
    expect(his.find('[data-test="detail-modal"]').exists()).toBe(true)
    his.unmount()
  })
})

describe('кнопка «Итоги дня» в форме планов', () => {
  const modal = (hasSummary?: boolean) => mount(DayModal, { props: { dateStr: `${ym}-10`, initial: [], hasSummary } })
  it('нет итогов — нет кнопки; есть — кнопка шлёт summary и не трогает планы', async () => {
    const a = modal(false)
    expect(a.find('[data-test="day-summary-btn"]').exists()).toBe(false)
    a.unmount()
    const b = modal(true)
    expect(b.find('[data-test="day-summary-btn"]').text()).toBe('Итоги дня')
    await b.find('input[type="text"]').setValue('Черновик')
    await b.find('[data-test="day-summary-btn"]').trigger('click')
    expect(b.emitted('summary')).toHaveLength(1)
    expect(b.emitted('save')).toBeUndefined()
    expect((b.find('input[type="text"]').element as HTMLInputElement).value).toBe('Черновик') // форма осталась как была
    b.unmount()
  })
})

describe('страница «Календарь» связывает форму и сетку', () => {
  it('App.vue передаёт hasSummary в форму и открывает итоги через сетку', () => {
    const app = appSrc
    expect(app).toContain('ref="grid"')
    expect(app).toContain(':has-summary="!!grid?.hasSummary(openDate)"')
    expect(app).toContain('@summary="grid?.openSummary(openDate)"')
  })
})
