import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PeriodPicker from './PeriodPicker.vue'
import CustomPeriodModal from './CustomPeriodModal.vue'
import type { PeriodState } from '../lib/chart'

// Новый выбор периода у графиков (BACKLOG 16, 13:44). «Сегодня» — пятница 2026-10-02; язык по умолчанию — английский.
const st = (range: any, from: string | null = null, to: string | null = null): PeriodState => ({ range, from, to })
const mountWith = (state: PeriodState) => mount(PeriodPicker, { props: { state } })
const pressed = (w: ReturnType<typeof mountWith>, test: string) => w.find(`[data-test="${test}"]`).attributes('aria-pressed')
const lastChange = (w: ReturnType<typeof mountWith>) => (w.emitted('change') ?? []).at(-1)?.[0]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 2, 12, 0, 0))
})
afterEach(() => vi.useRealTimers())

describe('PeriodPicker — пресеты', () => {
  it('одна строка: 7D · 30D · 90D · 1Y · All; активен сохранённый; календарного листалки нет; под ними — даты периода', () => {
    const w = mountWith(st('days30'))
    expect(w.findAll('.period-seg-btn').map((b) => b.text())).toEqual(['7D', '30D', '90D', '1Y', 'All'])
    expect(pressed(w, 'period-days30')).toBe('true')
    expect(pressed(w, 'period-days7')).toBe('false')
    expect(w.find('[data-test="period-stepper"]').exists()).toBe(false)
    expect(w.find('[data-test="period-caption"]').text()).toBe('Sep 3 – Oct 2')
    w.unmount()
  })

  it('выбор пресета отдаёт новый период', () => {
    const w = mountWith(st('days30'))
    w.find('[data-test="period-days7"]').trigger('click')
    expect(lastChange(w)).toMatchObject({ range: 'days7' })
    w.find('[data-test="period-year"]').trigger('click')
    expect(lastChange(w)).toMatchObject({ range: 'year' })
    w.find('[data-test="period-all"]').trigger('click')
    expect(lastChange(w)).toMatchObject({ range: 'all' })
    w.unmount()
  })

  it('«Всё»: подпись словами, не датами', () => {
    const w = mountWith(st('all'))
    expect(pressed(w, 'period-all')).toBe('true')
    expect(w.find('[data-test="period-caption"]').text()).toBe('All time')
    w.unmount()
  })
})

describe('PeriodPicker — неделя и месяц листаются стрелками', () => {
  it('сохранённая «эта неделя»: чип «Неделя» активен, подпись «This week», вперёд нельзя, назад — прошлая неделя', () => {
    const w = mountWith(st('week'))
    expect(pressed(w, 'period-mode-week')).toBe('true')
    expect(w.find('[data-test="period-step-label"]').text()).toBe('This week')
    expect(w.find('[data-test="period-next"]').attributes('disabled')).toBeDefined()
    w.find('[data-test="period-prev"]').trigger('click')
    expect(lastChange(w)).toEqual(st('custom', '2026-09-21', '2026-09-27'))
    w.unmount()
  })

  it('прошлая неделя (в т.ч. сохранённая как last_week): подпись датами, вперёд возвращает к текущей', () => {
    const w = mountWith(st('last_week'))
    expect(pressed(w, 'period-mode-week')).toBe('true')
    expect(w.find('[data-test="period-step-label"]').text()).toBe('Sep 21–27')
    expect(w.find('[data-test="period-next"]').attributes('disabled')).toBeUndefined()
    w.find('[data-test="period-next"]').trigger('click')
    expect(lastChange(w)).toEqual(st('custom', '2026-09-28', '2026-10-04'))
    w.unmount()
  })

  it('чип «Месяц» из другого режима даёт текущий месяц; повторное нажатие ничего не меняет', () => {
    const w = mountWith(st('days30'))
    w.find('[data-test="period-mode-month"]').trigger('click')
    expect(lastChange(w)).toEqual(st('custom', '2026-10-01', '2026-10-31'))
    const inMonth = mountWith(st('custom', '2026-10-01', '2026-10-31'))
    expect(pressed(inMonth, 'period-mode-month')).toBe('true')
    inMonth.find('[data-test="period-mode-month"]').trigger('click')
    expect(inMonth.emitted('change')).toBeUndefined()
    w.unmount()
    inMonth.unmount()
  })

  it('месяц: подпись «This month» у текущего, название месяца у прошлого; назад на предыдущий месяц', () => {
    const cur = mountWith(st('month'))
    expect(cur.find('[data-test="period-step-label"]').text()).toBe('This month')
    cur.find('[data-test="period-prev"]').trigger('click')
    expect(lastChange(cur)).toEqual(st('custom', '2026-09-01', '2026-09-30'))
    const sep = mountWith(st('custom', '2026-09-01', '2026-09-30'))
    expect(sep.find('[data-test="period-step-label"]').text()).toBe('September')
    sep.find('[data-test="period-prev"]').trigger('click')
    expect(lastChange(sep)).toEqual(st('custom', '2026-08-01', '2026-08-31'))
    cur.unmount()
    sep.unmount()
  })

  it('«вперёд» из текущего периода не шлёт событий (в будущее данных нет)', () => {
    const w = mountWith(st('month'))
    w.find('[data-test="period-next"]').trigger('click')
    expect(w.emitted('change')).toBeUndefined()
    w.unmount()
  })
})

describe('PeriodPicker — свой период и сохранённые раньше', () => {
  it('«Свой период» открывает календарь; применённый диапазон уходит как custom, окно закрывается', async () => {
    const w = mountWith(st('days30'))
    expect(w.findComponent(CustomPeriodModal).exists()).toBe(false)
    await w.find('[data-test="period-custom"]').trigger('click')
    const modal = w.findComponent(CustomPeriodModal)
    expect(modal.exists()).toBe(true)
    modal.vm.$emit('apply', '2026-08-03', '2026-08-15')
    await w.vm.$nextTick()
    expect(lastChange(w)).toEqual(st('custom', '2026-08-03', '2026-08-15'))
    expect(w.findComponent(CustomPeriodModal).exists()).toBe(false)
    w.unmount()
  })

  it('произвольный диапазон: чип «Свой» активен, листалки нет, подпись датами; открытая граница — «…»', () => {
    const w = mountWith(st('custom', '2026-08-03', '2026-08-15'))
    expect(pressed(w, 'period-custom')).toBe('true')
    expect(w.find('[data-test="period-stepper"]').exists()).toBe(false)
    expect(w.find('[data-test="period-caption"]').text()).toBe('Aug 3–15')
    const open = mountWith(st('custom', '2026-08-03', null))
    expect(open.find('[data-test="period-caption"]').text()).toBe('Aug 3 – …')
    w.unmount()
    open.unmount()
  })

  it('сохранённые 10 дней работают как диапазон с теми же датами, пресет ни один не активен', () => {
    const w = mountWith(st('days10'))
    expect(pressed(w, 'period-custom')).toBe('true')
    expect(w.findAll('.period-seg-btn').every((b) => b.attributes('aria-pressed') === 'false')).toBe(true)
    expect(w.find('[data-test="period-caption"]').text()).toBe('Sep 23 – Oct 2')
    w.unmount()
  })
})
