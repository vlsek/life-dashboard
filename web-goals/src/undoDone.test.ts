import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// 🐞 BACKLOG раздел 32: «если вдруг случайно ткнул, что цель выполнил, обратно её нельзя отметить, что не сделана».
// Выполненная цель живёт в списке «Выполненные цели»; у её строки была только «править»/«удалить».
const api = vi.hoisted(() => ({ toggleGoal: vi.fn(), stepGoal: vi.fn() }))
const goal = (over: Record<string, unknown>) => ({ id: 'g', user_id: 'u', name: 'Цель', points: 5, category: 'Спорт', stages: 1, current_stage: 0, done: false, done_date: null, deadline: null, difficulty: null, created_at: '2026-01-01', ...over })
const state = vi.hoisted(() => ({ items: null as unknown as { value: unknown[] } }))

vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    items: state.items,
    error: ref(null),
    flashed: ref({}),
    init: () => {},
    addGoal: vi.fn(),
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    toggleGoal: api.toggleGoal,
    stepGoal: api.stepGoal,
    setStage: vi.fn(),
  }),
}))

import App from './App.vue'

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  api.toggleGoal.mockReset()
  api.stepGoal.mockReset()
  state.items = ref([
    goal({ id: 'simple', name: 'Простая', done: true, done_date: '2026-10-03' }),
    goal({ id: 'multi', name: 'Многоэтапная', stages: 3, current_stage: 3, done: true, done_date: '2026-10-02' }),
    goal({ id: 'active', name: 'Ещё в работе' }),
  ])
})

describe('выполненные цели: снять отметку', () => {
  it('у каждой строки выполненной цели есть кнопка «снять отметку» (галочка-чекбокс, отмечена)', () => {
    const w = mount(App)
    const rows = w.findAll('[data-test="goal-done-row"]')
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      const b = r.find('[data-test="goal-undo"]')
      expect(b.exists()).toBe(true)
      expect(b.element.tagName).toBe('BUTTON')
      expect(b.attributes('role')).toBe('checkbox')
      expect(b.attributes('aria-checked')).toBe('true')
      expect(b.attributes('aria-label')).toContain('Снять отметку')
    }
    w.unmount()
  })

  it('простая цель: нажатие возвращает её в активные (toggleGoal), этап не трогается', async () => {
    const w = mount(App)
    const row = w.findAll('[data-test="goal-done-row"]').find((r) => r.text().includes('Простая'))!
    await row.find('[data-test="goal-undo"]').trigger('click')
    expect(api.toggleGoal).toHaveBeenCalledTimes(1)
    expect((api.toggleGoal.mock.calls[0][0] as { id: string }).id).toBe('simple')
    expect(api.stepGoal).not.toHaveBeenCalled()
    w.unmount()
  })

  it('многоэтапная цель: нажатие откатывает на один этап назад (stepGoal −1), а не просто снимает флаг', async () => {
    const w = mount(App)
    const row = w.findAll('[data-test="goal-done-row"]').find((r) => r.text().includes('Многоэтапная'))!
    await row.find('[data-test="goal-undo"]').trigger('click')
    expect(api.stepGoal).toHaveBeenCalledTimes(1)
    expect((api.stepGoal.mock.calls[0][0] as { id: string }).id).toBe('multi')
    expect(api.stepGoal.mock.calls[0][1]).toBe(-1)
    expect(api.toggleGoal).not.toHaveBeenCalled()
    w.unmount()
  })

  it('править и удалить в строке остались', () => {
    const w = mount(App)
    const row = w.find('[data-test="goal-done-row"]')
    expect(row.findAll('button')).toHaveLength(3) // снять отметку, править, удалить
    w.unmount()
  })
})
