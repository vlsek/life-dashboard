import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 74.3/73.5 срез 3b: «Нет активных целей» нельзя показывать, пока цели ещё грузятся (ложная пустота).
const state = vi.hoisted(() => ({ items: null as unknown as { value: unknown[] }, loaded: null as unknown as { value: boolean }, error: null as unknown as { value: string | null } }))
vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }), items: state.items, error: state.error, loaded: state.loaded, flashed: ref({}),
    init: () => {}, reload: async () => {}, addGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn(), toggleGoal: vi.fn(), stepGoal: vi.fn(), setStage: vi.fn(),
  }),
}))
import App from './App.vue'
import { t } from './lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  state.items = ref([])
  state.error = ref(null)
  state.loaded = ref(false)
})

describe('Цели: загрузка и пустота', () => {
  it('пока грузятся — «Загрузка…», «Нет активных целей» не мелькает', () => {
    const w = mount(App)
    expect(w.find('[data-testid="loading-active"]').text()).toBe('Загрузка…')
    expect(w.find('[data-testid="loading-active"]').attributes('role')).toBe('status')
    expect(w.text()).not.toContain(t('goals_no_active'))
    w.unmount()
  })

  it('загрузились и целей правда нет — пустота показывается, «Загрузка…» ушла', async () => {
    const w = mount(App)
    state.loaded.value = true
    await w.vm.$nextTick()
    expect(w.find('[data-testid="loading-active"]').exists()).toBe(false)
    expect(w.text()).toContain(t('goals_no_active'))
    w.unmount()
  })

  it('загрузились, цели есть — ни «Загрузки», ни «Нет активных»', async () => {
    state.items = ref([{ id: 'a', user_id: 'u', name: 'Бег', points: 5, category: 'Спорт', stages: 1, current_stage: 0, done: false, done_date: null, deadline: null, created_at: '2026-10-01' }])
    state.loaded.value = true
    const w = mount(App)
    expect(w.find('[data-testid="loading-active"]').exists()).toBe(false)
    expect(w.text()).not.toContain(t('goals_no_active'))
    w.unmount()
  })
})
