import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'

vi.mock('./lib/useCalendar', () => ({
  useCalendar: () => ({
    auth: { value: { status: 'ready', userId: 'u1', userEmail: 'u@example.com' } },
    byDate: { value: {} },
    deadlines: { value: {} },
    error: { value: null },
    init: vi.fn(),
    loadMonth: vi.fn(),
    savePlanned: vi.fn(),
  }),
}))

vi.mock('./components/AppShell.vue', () => ({ default: { template: '<div data-test="shell" />', props: ['userEmail'] } }))
vi.mock('./components/HistoryView.vue', () => ({ default: { template: '<div data-test="history-view" />' } }))
vi.mock('./components/DayModal.vue', () => ({ default: { template: '<div data-test="day-modal" />' } }))

describe('unified Calendar / History view', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/calendar/')
  })

  it('defaults to Calendar and switches to History without leaving the page', async () => {
    const { default: App } = await import('./App.vue')
    const wrapper = mount(App)
    expect(wrapper.find('[data-test="calendar-tab"]').attributes('style')).toContain('var(--accent)')
    expect(wrapper.find('[data-test="history-view"]').exists()).toBe(false)

    await wrapper.find('[data-test="history-tab"]').trigger('click')
    expect(wrapper.find('[data-test="history-view"]').exists()).toBe(true)
    expect(window.location.pathname).toBe('/calendar/')
    expect(window.location.search).toBe('?view=history')
    wrapper.unmount()
  })

  it('opens directly in History when the compatibility query is present', async () => {
    window.history.replaceState({}, '', '/calendar/?view=history')
    const { default: App } = await import('./App.vue')
    const wrapper = mount(App)
    expect(wrapper.find('[data-test="history-view"]').exists()).toBe(true)
    wrapper.unmount()
  })
  it('keeps the History implementation complete and local to the Calendar pilot', () => {
    const source = readFileSync('src/components/HistoryView.vue', 'utf8')
    expect(source).toContain('data-test="hist-grid"')
    expect(source).toContain('<DayDetailModal')
    expect(source).not.toContain('web-history/src')
  })
})
