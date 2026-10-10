import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 44.2: подразделы «Целей» сворачиваются, состояние помнится; «Выполненные» и настройки свёрнуты по умолчанию.
const goal = (over: Record<string, unknown>) => ({ id: 'g', user_id: 'u', name: 'Цель', points: 5, category: 'Спорт', stages: 1, current_stage: 0, done: false, done_date: null, deadline: null, difficulty: null, created_at: '2026-01-01', ...over })
const state = vi.hoisted(() => ({ items: null as unknown as { value: unknown[] } }))

vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    items: state.items,
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

import App from './App.vue'

const iso = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  state.items = ref([
    goal({ id: 'a', name: 'Бег', category: 'Спорт', deadline: iso(3) }),
    goal({ id: 'b', name: 'Книга', category: 'Учёба' }),
    goal({ id: 'c', name: 'Сделано', category: 'Спорт', done: true, done_date: '2026-10-03' }),
  ])
})

describe('Цели: сворачиваемые подразделы', () => {
  it('категории — секции со счётчиком, раскрыты; «Выполненные» и «Настройки» свёрнуты', () => {
    const w = mount(App)
    expect(w.get('[data-section="cat-Спорт"]').attributes('data-open')).toBe('true')
    expect(w.get('[data-section="cat-Спорт"] [data-test="section-count"]').text()).toBe('1')
    expect(w.get('[data-section="done"]').attributes('data-open')).toBe('false')
    expect(w.get('[data-section="done"] [data-test="section-count"]').text()).toBe('1')
    expect(w.get('[data-section="settings"]').attributes('data-open')).toBe('false')
    w.unmount()
  })

  it('«Ближайшие сроки» показывается, когда есть цель со сроком ≤14 дней; без таких — подраздела нет', () => {
    const w = mount(App)
    expect(w.findAll('[data-test="goal-upcoming-row"]')).toHaveLength(1)
    expect(w.get('[data-test="goal-upcoming-row"]').text()).toContain('Бег')
    w.unmount()
    state.items = ref([goal({ id: 'b', name: 'Книга' })])
    const w2 = mount(App)
    expect(w2.find('[data-section="upcoming"]').exists()).toBe(false)
    w2.unmount()
  })

  it('свёрнутое состояние помнится на устройстве', async () => {
    const w = mount(App)
    await w.get('[data-test="section-toggle-cat-Спорт"]').trigger('click')
    expect(w.get('[data-section="cat-Спорт"]').attributes('data-open')).toBe('false')
    expect(localStorage.getItem('goals_section_cat-Спорт')).toBe('0')
    w.unmount()
    const w2 = mount(App)
    expect(w2.get('[data-section="cat-Спорт"]').attributes('data-open')).toBe('false')
    w2.unmount()
  })

  it('в заголовке категории — мини-прогресс «выполнено/всего» (выполненные цели считаются)', () => {
    const w = mount(App)
    expect(w.get('[data-section="cat-Спорт"] [data-test="section-progress"]').text()).toBe('1/2')
    expect(w.get('[data-section="cat-Учёба"] [data-test="section-progress"]').text()).toBe('0/1')
    w.unmount()
  })
})
