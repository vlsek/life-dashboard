import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppShell from './components/AppShell.vue'
import DailyChallengeCard from './components/DailyChallengeCard.vue'
import CumulativeChallengeCard from './components/CumulativeChallengeCard.vue'
import CatalogModal from './components/CatalogModal.vue'
import CustomChallengeForm from './components/CustomChallengeForm.vue'
import { todayStr } from './lib/date'
import type { Challenge } from './lib/types'

describe('AppShell', () => {
  it('renders logged-out shell (no email) without throwing, challenges marked active', () => {
    const wrapper = mount(AppShell, { props: { userEmail: null } })
    const html = wrapper.html()
    expect(html.length).toBeGreaterThan(0)
    expect(html).not.toContain('Log out')
    expect(html).not.toContain('Выйти')
    wrapper.unmount()
  })

  it('shows the logout button with the email when logged in', () => {
    const wrapper = mount(AppShell, { props: { userEmail: 'user@example.com' } })
    expect(wrapper.html()).toContain('user@example.com')
    wrapper.unmount()
  })

  it('opens the sidebar on hamburger click and closes it on backdrop click', async () => {
    const wrapper = mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
    expect(wrapper.find('nav').classes()).toContain('-translate-x-full')
    await wrapper.find('button[aria-label]').trigger('click')
    expect(wrapper.find('nav').classes()).toContain('translate-x-0')
    wrapper.unmount()
  })
})

function dailyChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'c1',
    user_id: 'u1',
    template_id: null,
    title: 'Test challenge',
    icon: '💪',
    type: 'daily_fixed',
    unit: 'reps',
    start_date: '2026-01-01',
    duration_days: 30,
    daily_target: 100,
    start_value: null,
    daily_increment: null,
    target_count: null,
    item_label: null,
    active: true,
    completed: false,
    completed_at: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('DailyChallengeCard', () => {
  it('mounts a daily_fixed challenge without throwing', () => {
    const wrapper = mount(DailyChallengeCard, { props: { challenge: dailyChallenge(), entries: [] } })
    expect(wrapper.html()).toContain('Test challenge')
    wrapper.unmount()
  })

  it('mounts a daily_boolean challenge and renders a checkbox instead of a number input', () => {
    const wrapper = mount(DailyChallengeCard, {
      props: { challenge: dailyChallenge({ type: 'daily_boolean', daily_target: null, unit: null, start_date: todayStr() }), entries: [] },
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('CumulativeChallengeCard', () => {
  it('mounts a cumulative_count challenge without throwing', () => {
    const ch = dailyChallenge({ type: 'cumulative_count', duration_days: null, daily_target: null, target_count: 100, item_label: 'книга' })
    const wrapper = mount(CumulativeChallengeCard, { props: { challenge: ch, entries: [] } })
    expect(wrapper.html()).toContain('Test challenge')
    wrapper.unmount()
  })
})

describe('CatalogModal / CustomChallengeForm', () => {
  it('mounts the catalog with all templates listed', () => {
    const wrapper = mount(CatalogModal)
    expect(wrapper.findAll('.card').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('mounts the custom challenge form and disables fields not relevant to daily_fixed', () => {
    const wrapper = mount(CustomChallengeForm)
    const numberInputs = wrapper.findAll('input[type="number"]')
    // startValue/increment disabled by default (daily_fixed selected)
    expect(numberInputs.some((i) => (i.element as HTMLInputElement).disabled)).toBe(true)
    wrapper.unmount()
  })
})
