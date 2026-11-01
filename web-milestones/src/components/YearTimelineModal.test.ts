import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import YearTimelineModal from './YearTimelineModal.vue'
import type { Milestone } from '../lib/types'

const ms = (p: Partial<Milestone>): Milestone => ({ id: 'm1', user_id: 'u', name: 'Замена масла', category: 'Авто', last_date: null, interval_value: null, interval_unit: null, due_date: null, last_km: null, interval_km: null, note: null, history: [], done: false, created_at: '2026-01-01', ...p })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 5, 15))
  localStorage.setItem('site_lang', 'ru')
})
afterEach(() => vi.useRealTimers())

describe('YearTimelineModal (76.10)', () => {
  const items = [ms({ id: 'a', name: 'Масло', last_date: '2026-03-10', due_date: '2026-05-01', interval_value: 3, interval_unit: 'month' }), ms({ id: 'b', name: 'Стоматолог', due_date: '2026-09-20' })]

  it('12 месяцев; события по месяцам с подписью статуса словом: сделано, просрочено, запланировано', () => {
    const w = mount(YearTimelineModal, { props: { items } })
    expect(w.findAll('[data-test^="tl-month-"]').length).toBe(12)
    expect(w.get('[data-test="tl-month-2"]').text()).toContain('Масло')
    expect(w.get('[data-test="tl-month-2"]').text()).toContain('Сделано')
    expect(w.get('[data-test="tl-month-4"]').text()).toContain('Просрочено') // 1 мая < 15 июня
    expect(w.get('[data-test="tl-month-7"]').text()).toContain('Масло') // 1 августа — повтор через 3 месяца
    expect(w.get('[data-test="tl-month-8"]').text()).toContain('Стоматолог')
    expect(w.get('[data-test="tl-month-8"]').text()).toContain('Запланировано')
    expect(w.get('[data-test="tl-totals"]').text()).toBe('Сделано: 1 · Запланировано: 3 · Просрочено: 1')
  })
  it('текущий месяц помечен; годы листаются, в пустом году — подсказка', async () => {
    const w = mount(YearTimelineModal, { props: { items } })
    expect(w.get('[data-test="tl-month-5"]').attributes('data-current-month')).toBe('true')
    expect(w.get('[data-test="tl-month-4"]').attributes('data-current-month')).toBe('false')
    expect(w.find('[data-test="tl-empty"]').exists()).toBe(false)
    await w.get('[data-test="tl-prev"]').trigger('click')
    expect(w.get('[data-test="tl-year"]').text()).toContain('2025')
    expect(w.find('[data-test="tl-empty"]').exists()).toBe(true)
    expect(w.find('[data-current-month="true"]').exists()).toBe(false) // в чужом году «сейчас» нет
    await w.get('[data-test="tl-next"]').trigger('click')
    await w.get('[data-test="tl-next"]').trigger('click')
    expect(w.get('[data-test="tl-year"]').text()).toContain('2027')
  })
  it('закрытие кнопкой', async () => {
    const w = mount(YearTimelineModal, { props: { items: [] } })
    await w.get('[data-test="tl-close"]').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })
})
