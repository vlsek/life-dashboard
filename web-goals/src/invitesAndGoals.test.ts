import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// 🐞 «пропали все мои цели» (владелец 2026-10-10): когда миграция 063 применена (invites.available = true), список целей не должен прятаться.
const goal = (over: Record<string, unknown>) => ({ id: 'g', user_id: 'u', name: 'Цель', points: 5, category: 'Спорт', stages: 1, current_stage: 0, done: false, done_date: null, deadline: null, difficulty: null, created_at: '2026-01-01', ...over })
const state = vi.hoisted(() => ({ available: true }))

vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    items: ref([goal({ id: 'a', name: 'Бег' }), goal({ id: 'b', name: 'Сделана', done: true, done_date: '2026-10-03' })]),
    error: ref(null),
    flashed: ref({}),
    init: () => {},
    reload: async () => {},
    addGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    toggleGoal: vi.fn(),
    stepGoal: vi.fn(),
    setStage: vi.fn(),
  }),
}))
vi.mock('./lib/goalInvites', async (orig) => {
  const real = await orig<typeof import('./lib/goalInvites')>()
  return {
    ...real,
    useGoalInvites: () => ({ rows: ref([]), available: ref(state.available), busyId: ref(''), actionError: ref(''), load: async () => {}, respond: vi.fn(), dismiss: vi.fn() }),
  }
})

import App from './App.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('Цели: приглашения друзей не прячут список', () => {
  it.each([true, false])('invites.available = %s — цели видны', (available) => {
    state.available = available
    const w = mount(App)
    expect(w.text()).toContain('Бег')
    expect(w.find('[data-test="goals-body"]').exists()).toBe(true)
    expect(w.findAll('[data-test="goal-done-row"]')).toHaveLength(1)
    w.unmount()
  })
})
