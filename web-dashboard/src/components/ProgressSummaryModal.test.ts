import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressSummaryModal from './ProgressSummaryModal.vue'
import { daySummary } from '../lib/progressSummary'
import type { DayProgressSettings } from '../lib/progressSettings'
import type { Metric } from '../lib/types'

const settings: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' }
const m = (id: string, name: string) => ({ id, name, user_id: 'u', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0 }) as unknown as Metric

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('ProgressSummaryModal', () => {
  const summary = daySummary(settings, [m('a', 'Вода'), m('b', 'Зарядка')], { a: true }, '2026-09-30', [{ text: 'Бонус', done: true, bonus: true }], [])

  it('показывает итог, сделано/осталось с процентами и бонус', () => {
    const w = mount(ProgressSummaryModal, { props: { kind: 'day', summary } })
    expect(w.find('[data-test="summary-total"]').text()).toContain('70%') // 50% основа + 20% бонус
    expect(w.find('[data-test="summary-total"]').text()).toContain('1 из 2 пунктов')
    expect(w.find('[data-test="summary-bonus-line"]').text()).toContain('50% основа + 20% бонус')
    expect(w.find('[data-test="done-item"]').text()).toContain('Вода')
    expect(w.find('[data-test="done-item"]').text()).toContain('+50%')
    expect(w.find('[data-test="open-item"]').text()).toContain('Зарядка')
    expect(w.find('[data-test="open-item"]').text()).toContain('50%')
    expect(w.find('[data-test="bonus-item"]').text()).toContain('+20%')
    w.unmount()
  })

  it('шестерёнка внутри сводки поднимает settings; «Закрыть» — close', async () => {
    const w = mount(ProgressSummaryModal, { props: { kind: 'week', summary } })
    await w.find('[data-test="open-settings"]').trigger('click')
    expect(w.emitted('settings')).toHaveLength(1)
    await w.findAll('button').at(-1)!.trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })

  it('без пунктов — пояснение вместо списков', () => {
    const empty = daySummary({ ...settings, includeMetrics: false, includePlanned: false }, [], {}, '2026-09-30', [], [])
    const w = mount(ProgressSummaryModal, { props: { kind: 'day', summary: empty } })
    expect(w.find('[data-test="summary-empty"]').exists()).toBe(true)
    expect(w.find('[data-test="done-item"]').exists()).toBe(false)
    w.unmount()
  })
})
