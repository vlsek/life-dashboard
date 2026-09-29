import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EveningReminderBanner from './components/EveningReminderBanner.vue'
import type { Metric } from './lib/types'

const m = (over: Partial<Metric> & { id: string; name: string }) =>
  ({ user_id: 'u', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...over }) as Metric

const items = [
  { metric: m({ id: 'read', name: 'Reading' }), value: false },
  { metric: m({ id: 'pushups', name: 'Push-ups', type: 'number', goal_value: 50, unit: 'reps' }), value: 20 },
]

describe('EveningReminderBanner', () => {
  it('shows the title collapsed, without the list of metrics', () => {
    localStorage.setItem('site_lang', 'ru')
    const w = mount(EveningReminderBanner, { props: { items } })
    expect(w.text()).toContain('Остались невыполненные метрики!')
    expect(w.text()).toContain('Сделайте их, чтобы не потерять стрейк')
    expect(w.find('[data-test="evening-reminder-details"]').exists()).toBe(false)
    // Второй абзац — отдельный блочный элемент под заголовком, а не продолжение строки заголовка
    const text = w.find('[data-test="evening-reminder-text"]')
    expect(text.classes()).toContain('block')
    expect(text.element.parentElement?.querySelector('strong')?.textContent).not.toContain('Сделайте их')
    expect(w.text()).not.toContain('Reading')
  })

  it('click on the banner expands details: every remaining metric with progress; second click collapses', async () => {
    const w = mount(EveningReminderBanner, { props: { items } })
    await w.find('[data-test="evening-reminder-toggle"]').trigger('click')
    const rows = w.findAll('[data-test="evening-reminder-item"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Reading')
    expect(rows[1].text()).toContain('Push-ups')
    expect(rows[1].text()).toContain('20 / 50 reps')
    expect(w.find('[data-test="evening-reminder-toggle"]').attributes('aria-expanded')).toBe('true')
    await w.find('[data-test="evening-reminder-toggle"]').trigger('click')
    expect(w.find('[data-test="evening-reminder-details"]').exists()).toBe(false)
  })

  it('the X button emits dismiss and does not expand the details', async () => {
    const w = mount(EveningReminderBanner, { props: { items } })
    await w.find('[data-test="evening-reminder-dismiss"]').trigger('click')
    expect(w.emitted('dismiss')).toHaveLength(1)
    expect(w.find('[data-test="evening-reminder-details"]').exists()).toBe(false)
  })
})
