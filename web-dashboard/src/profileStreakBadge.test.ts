import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// Подмена useProfile — этот тест только про новый стрик-бейдж в строке профиля (перенесён
// из отдельного раздела внизу App.vue, см. COORDINATION.md), не про сеть/профиль как таковой.
vi.mock('./lib/useProfile', () => ({
  useProfile: () => ({
    profile: ref({ avatar_url: null, birthdate: null, goal_type: null }),
    params: ref([]),
    stats: computed(() => []),
    balance: ref(null),
    loaded: ref(true),
    error: ref(null),
    init: vi.fn(),
    uploadAvatar: vi.fn(),
    saveBirthdate: vi.fn(),
    addParam: vi.fn(),
    updateParam: vi.fn(),
    deleteParam: vi.fn(),
    refreshValues: vi.fn(),
  }),
}))

import ProfileSection from './components/ProfileSection.vue'
import type { StreakItem } from './lib/streaks'

function metricStreak(over: Partial<StreakItem> = {}): StreakItem {
  return { kind: 'metric', metric: { id: 'm1', name: 'Отжимания', icon: '💪' } as any, streak: 5, unit: '', todayCounted: true, ...over } as StreakItem
}

describe('ProfileSection: streak badge', () => {
  it('renders nothing when there is no streak (matches vanilla: badge just absent)', () => {
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    expect(w.find('[data-test="streak-badge"]').exists()).toBe(false)
    w.unmount()
  })

  it('shows the top streak count inline in the profile row', () => {
    const w = mount(ProfileSection, { props: { userId: 'u1', topStreak: metricStreak({ streak: 7 }) } })
    const badge = w.find('[data-test="streak-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('7')
    w.unmount()
  })

  it('lit (todayCounted) badge is not dimmed and uses the two-tone flame', () => {
    const w = mount(ProfileSection, { props: { userId: 'u1', topStreak: metricStreak({ todayCounted: true }) } })
    const badge = w.find('[data-test="streak-badge"]')
    expect(badge.classes()).not.toContain('streak-unlit')
    expect(badge.find('svg.streak-flame').exists()).toBe(true)
    w.unmount()
  })

  it('unlit (not counted today) badge is dimmed and uses the outline flame', () => {
    const w = mount(ProfileSection, { props: { userId: 'u1', topStreak: metricStreak({ todayCounted: false }) } })
    const badge = w.find('[data-test="streak-badge"]')
    expect(badge.classes()).toContain('streak-unlit')
    expect(badge.find('svg.streak-flame').exists()).toBe(false)
    w.unmount()
  })

  it('clicking the badge emits show-streaks (opens the all-streaks modal in App.vue)', async () => {
    const w = mount(ProfileSection, { props: { userId: 'u1', topStreak: metricStreak() } })
    await w.find('[data-test="streak-badge"]').trigger('click')
    expect(w.emitted('show-streaks')).toBeTruthy()
    w.unmount()
  })

  it('does not open progress-settings when the streak badge is clicked (separate control)', async () => {
    const w = mount(ProfileSection, { props: { userId: 'u1', topStreak: metricStreak() } })
    await w.find('[data-test="streak-badge"]').trigger('click')
    expect(w.emitted('progress-settings')).toBeFalsy()
    w.unmount()
  })
})
