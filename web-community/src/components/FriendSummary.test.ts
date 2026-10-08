import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Сводка по другу в окне профиля (BACKLOG 41 «8:51», миграция 056).
const h = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown }, calls: 0, gate: null as Promise<void> | null }))
vi.mock('../lib/supabase', () => ({ sb: { rpc: async () => ((h.calls += 1), h.gate && (await h.gate), h.result) } }))

import PublicProfileModal from './PublicProfileModal.vue'

const summary = (o: Record<string, unknown> = {}) => ({
  user_id: 'f1', display_name: 'Аня', avatar_url: null, registered_at: '2026-09-12T10:00:00Z', friends_since: '2026-10-03T09:00:00Z', hidden: false,
  points_total: 1250, points_week: 42, perfect_streak: 6, goals_done: 9, active_days_30: 21, favorite_exercise: 'Подтягивания', badges_count: 3, badges: [], frame: null, ...o,
})
const base = { name: 'Аня', avatarUrl: null, keys: ['streak_7'], points: 1250, streak: 6 }

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.calls = 0
  h.gate = null
  h.result = { data: summary(), error: null }
})

describe('сводка по другу в окне профиля', () => {
  it('для друга: даты и плитки со всем, что отдала функция', async () => {
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await flushPromises()
    expect(w.find('[data-testid="friend-summary-dates"]').text()).toContain('С нами с')
    expect(w.find('[data-testid="friend-summary-dates"]').text()).toContain('В друзьях с')
    expect(w.find('[data-testid="summary-week"]').text()).toContain('42')
    expect(w.find('[data-testid="summary-total"]').text()).toContain('1250')
    expect(w.find('[data-testid="summary-streak"]').text()).toContain('6')
    expect(w.find('[data-testid="summary-goals"]').text()).toContain('9')
    expect(w.find('[data-testid="summary-active"]').text()).toContain('21')
    expect(w.find('[data-testid="summary-exercise"]').text()).toContain('Подтягивания')
    // значки из прежнего блока на месте
    expect(w.find('[data-testid="public-profile-badges"]').exists()).toBe(true)
  })

  it('скрытый друг: только даты и пояснение, плиток нет', async () => {
    h.result = { data: summary({ hidden: true, points_total: undefined, points_week: undefined, perfect_streak: undefined, goals_done: undefined, active_days_30: undefined, favorite_exercise: null }), error: null }
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await flushPromises()
    expect(w.find('[data-testid="friend-summary-dates"]').exists()).toBe(true)
    expect(w.find('[data-testid="friend-summary-hidden"]').exists()).toBe(true)
    expect(w.find('[data-testid="friend-summary-stats"]').exists()).toBe(false)
  })

  it('не друг (человек из рейтинга): запрос не делается, окно как раньше', async () => {
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'x9', isFriend: false } })
    await flushPromises()
    expect(h.calls).toBe(0)
    expect(w.find('[data-testid="friend-summary-stats"]').exists()).toBe(false)
    expect(w.find('[data-testid="public-profile-badges"]').exists()).toBe(true)
  })

  it('без миграции 056: блока сводки нет, ошибки тоже нет — окно как раньше', async () => {
    h.result = { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await flushPromises()
    expect(w.find('[data-testid="friend-summary-stats"]').exists()).toBe(false)
    expect(w.find('[data-testid="friend-summary-error"]').exists()).toBe(false)
    expect(w.find('[data-testid="public-profile-badges"]').exists()).toBe(true)
  })

  it('другая ошибка: короткое пояснение без сырого текста ошибки', async () => {
    h.result = { data: null, error: { code: '500', message: 'https://haxmgtflegsfpxieaydv.supabase.co boom' } }
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await flushPromises()
    const e = w.find('[data-testid="friend-summary-error"]')
    expect(e.exists()).toBe(true)
    expect(e.text()).not.toContain('supabase')
    expect(w.find('[data-testid="friend-summary-loading"]').exists()).toBe(false)
  })

  it('пока грузится — «Загружаю сводку…»', async () => {
    let open!: () => void
    h.gate = new Promise<void>((r) => (open = r))
    const w = mount(PublicProfileModal, { props: { ...base, userId: 'f1', isFriend: true } })
    await w.vm.$nextTick()
    expect(w.find('[data-testid="friend-summary-loading"]').exists()).toBe(true)
    open()
    await flushPromises()
    expect(w.find('[data-testid="friend-summary-loading"]').exists()).toBe(false)
    expect(w.find('[data-testid="friend-summary-stats"]').exists()).toBe(true)
  })
})
