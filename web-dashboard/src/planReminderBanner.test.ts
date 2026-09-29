import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlanReminderBanner from './components/PlanReminderBanner.vue'

const items = [
  { index: 0, time: '09:00', text: 'Зарядка', key: 'k1' },
  { index: 1, time: '15:00', text: 'Позвонить', key: 'k2' },
]

describe('PlanReminderBanner', () => {
  it('renders nothing without items', () => {
    const w = mount(PlanReminderBanner, { props: { items: [] } })
    expect(w.find('[data-test="plan-reminder"]').exists()).toBe(false)
  })
  it('lists time + text per item and emits the key of the dismissed one', async () => {
    localStorage.setItem('site_lang', 'ru')
    const w = mount(PlanReminderBanner, { props: { items } })
    const rows = w.findAll('[data-test="plan-reminder-item"]')
    expect(rows).toHaveLength(2)
    expect(rows[1].text()).toContain('15:00')
    expect(rows[1].text()).toContain('Позвонить')
    expect(w.text()).toContain('Пора по плану')
    await rows[1].find('[data-test="plan-reminder-dismiss"]').trigger('click')
    expect(w.emitted('dismiss')![0]).toEqual(['k2'])
  })
})
