import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// Клик по баллам в профиле открывает окно «за что начислены баллы», а не уводит сразу в магазин (BACKLOG 7.1).
vi.mock('./lib/useProfile', () => ({
  useProfile: () => ({
    profile: ref({ avatar_url: null, birthdate: null, goal_type: null }),
    params: ref([]),
    stats: computed(() => []),
    balance: ref(42),
    loaded: ref(true),
    error: ref(null),
    init: vi.fn(), uploadAvatar: vi.fn(), saveBirthdate: vi.fn(), addParam: vi.fn(),
    updateParam: vi.fn(), deleteParam: vi.fn(), refreshValues: vi.fn(),
  }),
}))
vi.mock('./lib/usePointsLog', () => ({
  usePointsLog: () => ({ log: ref(null), error: ref(null), loading: ref(false), load: vi.fn() }),
}))

import ProfileSection from './components/ProfileSection.vue'

describe('ProfileSection: balance', () => {
  it('is a button (not a link to the shop) that opens the points modal', async () => {
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    const btn = w.find('[data-test="balance-btn"]')
    expect(btn.exists()).toBe(true)
    expect(btn.element.tagName).toBe('BUTTON')
    expect(btn.text()).toContain('42')
    expect(w.find('a[href="/shop/"]').exists()).toBe(false)
    expect(w.find('[data-test="points-modal"]').exists()).toBe(false)
    await btn.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="points-modal"]').exists()).toBe(true)
    expect(w.find('[data-test="points-shop-link"]').attributes('href')).toBe('/shop/')
    w.unmount()
  })
})

// BACKLOG 7.2: вёрстка профиля с телефона — две чёткие строки вместо одного flex-wrap-ряда.
describe('ProfileSection: mobile layout', () => {
  it('keeps avatar/ring/age and the score group in the top row and body params in their own wrapping row', () => {
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    const top = w.find('[data-test="profile-top-row"]')
    const params = w.find('[data-test="profile-params-row"]')
    expect(top.exists() && params.exists()).toBe(true)
    expect(top.classes()).toContain('flex-wrap')
    expect(params.classes()).toContain('flex-wrap')
    // баллы (и стрик) справа в верхней строке, параметры тела и кнопка «линейка» — во второй
    expect(top.find('[data-test="profile-score-group"]').find('[data-test="balance-btn"]').exists()).toBe(true)
    expect(top.find('[data-test="params-btn"]').exists()).toBe(false)
    expect(params.find('[data-test="params-btn"]').exists()).toBe(true)
    expect(w.find('[data-test="profile-score-group"]').classes()).toContain('ml-auto')
    // BACKLOG 16, 13:28: промежуток между огоньком стрика и монетой сокращён (был gap-3 = 12 px)
    expect(w.find('[data-test="profile-score-group"]').classes()).toContain('gap-2')
    expect(w.find('[data-test="profile-score-group"]').classes()).not.toContain('gap-3')
    w.unmount()
  })
})
