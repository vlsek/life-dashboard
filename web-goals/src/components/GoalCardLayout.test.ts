import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GoalCard from './GoalCard.vue'
import cardSource from './GoalCard.vue?raw'
import type { Goal } from '../lib/types'

// BACKLOG 58.8 (часть 2, вёрстка «Целей»: «дыры, расстояния, отступы»). Метод — скриншоты в Chromium (360 и 1280 px): заголовки карточек с кольцом
// процента и с кружком начинались с разных отступов, плашка баллов сжимала заголовок (до 4 строк) и оставляла пустоту справа у простых целей,
// кнопки действий съедали ширину чипов и прогресса.
const goal = (o: Partial<Goal> = {}): Goal => ({
  id: 'g1', user_id: 'u', name: 'Накопить на отпуск', points: 20, category: 'Финансы', stages: 1, current_stage: 0,
  done: false, done_date: null, deadline: null, difficulty: null, created_at: '2026-09-01', ...o,
})
const mountCard = (o: Partial<Goal> = {}) => mount(GoalCard, { props: { goal: goal(o) } })

describe('GoalCard: раскладка (58.8)', () => {
  it('и кружок простой цели, и кольцо процента лежат в одной левой колонке фиксированной ширины', () => {
    const simple = mountCard()
    const multi = mountCard({ stages: 4, current_stage: 1 })
    for (const w of [simple, multi]) expect(w.find('[data-test="goal-lead"]').exists()).toBe(true)
    expect(simple.find('[data-test="goal-lead"] [data-test="goal-check"]').exists()).toBe(true)
    expect(multi.find('[data-test="goal-lead"] [data-test="goal-percent"]').exists()).toBe(true)
    expect(cardSource).toMatch(/\.goal-lead \{[^}]*width: 2\.5rem[^}]*justify-content: center/s)
  })
  it('баллы — в строке чипов (а не рядом с заголовком), строка есть и у цели без сложности и срока', () => {
    const plain = mountCard()
    expect(plain.find('[data-test="goal-chips"] [data-test="goal-points"]').exists()).toBe(true)
    expect(plain.find('[data-test="goal-name"]').element.querySelector('[data-test="goal-points"]')).toBe(null) // не внутри заголовка
    const rich = mountCard({ difficulty: 'hard', deadline: '2026-12-31' })
    expect(rich.find('[data-test="goal-chips"] [data-test="goal-diff"]').exists()).toBe(true)
    expect(rich.find('[data-test="goal-chips"] [data-test="goal-deadline"]').exists()).toBe(true)
    // плашка баллов — последняя в строке (прижата вправо)
    expect(rich.find('[data-test="goal-chips"]').element.lastElementChild).toBe(rich.find('[data-test="goal-points"]').element)
  })
  it('кнопки действий вынесены в угол карточки, заголовок оставляет под них место и не ниже них', () => {
    const w = mountCard()
    expect(w.find('[data-test="goal-actions"] [data-test="goal-edit"]').exists()).toBe(true)
    expect(w.find('[data-test="goal-actions"] [data-test="goal-delete"]').exists()).toBe(true)
    expect(cardSource).toMatch(/\.goal-actions \{[^}]*position: absolute[^}]*top: 0\.75rem[^}]*right: 0\.75rem/s)
    expect(cardSource).toMatch(/\.goal-title \{[^}]*padding-right: 4\.4rem[^}]*min-height: 1\.9rem/s)
    expect(w.find('[data-test="goal-name"]').classes()).toContain('goal-title')
  })
})
