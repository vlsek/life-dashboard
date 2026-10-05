import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import SavedTick from './components/SavedTick.vue'
import tickSource from './components/SavedTick.vue?raw'
import cardSource from './components/GoalCard.vue?raw'
import GoalCard from './components/GoalCard.vue'

// BACKLOG 23:25 / 815, срез 3: «значение сохранено» для целей — галочка в углу карточки / строки выполненной цели.
const goal = (over: Record<string, unknown> = {}) => ({ id: 'g1', user_id: 'u', name: 'Цель', points: 5, category: 'Спорт', stages: 1, current_stage: 0, done: false, done_date: null, deadline: null, difficulty: null, created_at: '2026-01-01', ...over })
const h = vi.hoisted(() => ({ items: null as unknown as { value: unknown[] }, flashed: null as unknown as { value: Record<string, boolean> } }))

vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    items: h.items,
    error: ref(null),
    flashed: h.flashed,
    init: () => {},
    addGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn(), toggleGoal: vi.fn(), stepGoal: vi.fn(), setStage: vi.fn(),
  }),
}))
import App from './App.vue'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('SavedTick (копия для Целей)', () => {
  it('показывается только при show=true, подпись «Сохранено» / «Saved»', () => {
    expect(mount(SavedTick, { props: { show: false } }).find('[data-test="saved-tick"]').exists()).toBe(false)
    expect(mount(SavedTick, { props: { show: true } }).find('[data-test="saved-tick"]').text()).toBe('Сохранено')
    localStorage.setItem('site_lang', 'en')
    expect(mount(SavedTick, { props: { show: true } }).text()).toBe('Saved')
  })
  it('движение выключается (reduced-motion и общий выключатель), клики не перехватываются', () => {
    expect(tickSource).toContain('prefers-reduced-motion: reduce')
    expect(tickSource).toContain("html[data-motion='off']")
    expect(tickSource).toContain('pointer-events: none')
  })
})

describe('GoalCard: проп saved', () => {
  it('saved=true — галочка и класс вспышки; без пропа — ничего', () => {
    const on = mount(GoalCard, { props: { goal: goal() as never, saved: true } })
    expect(on.find('[data-test="saved-tick"]').exists()).toBe(true)
    expect(on.find('[data-test="goal-card"]').classes()).toContain('goal-card-saved')
    const off = mount(GoalCard, { props: { goal: goal() as never } })
    expect(off.find('[data-test="saved-tick"]').exists()).toBe(false)
    expect(off.find('[data-test="goal-card"]').classes()).not.toContain('goal-card-saved')
  })
  it('вспышка рамки гасится при reduced-motion и data-motion=off', () => {
    expect(cardSource).toContain('prefers-reduced-motion: reduce')
    expect(cardSource).toContain("html[data-motion='off']")
  })
})

describe('страница Целей: галочка по flashed', () => {
  it('у активной цели и у строки выполненной — только у той, чей id в flashed', () => {
    h.items = ref([goal({ id: 'a' }), goal({ id: 'b', name: 'Другая' }), goal({ id: 'd', name: 'Готово', done: true, done_date: '2026-10-03' })])
    h.flashed = ref({ a: true, d: true })
    const w = mount(App)
    const cards = w.findAll('[data-test="goal-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].find('[data-test="saved-tick"]').exists()).toBe(true)
    expect(cards[1].find('[data-test="saved-tick"]').exists()).toBe(false)
    expect(w.find('[data-test="goal-done-row"] [data-test="saved-tick"]').exists()).toBe(true)
  })
  it('flashed пуст — ни одной галочки', () => {
    h.items = ref([goal({ id: 'a' })])
    h.flashed = ref({})
    expect(mount(App).find('[data-test="saved-tick"]').exists()).toBe(false)
  })
})
