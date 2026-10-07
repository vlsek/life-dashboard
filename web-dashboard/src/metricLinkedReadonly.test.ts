import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SetsCard from './components/SetsCard.vue'
import NumberMetricField from './components/NumberMetricField.vue'
import type { Metric } from './lib/types'

// Миграция 054 / BACKLOG 19, 30: метрика, связанная с упражнением «Тренировок», на Дашборде — только чтение; подходы вводятся один раз, в «Тренировках».
const metric = (o: Partial<Metric> = {}) => ({ id: 'm1', user_id: 'u', name: 'Подтягивания', icon: null, type: 'sets', unit: null, goal_value: null, goal_direction: 'at_least', schedule: null, category_id: null, position: 1, ...o }) as Metric
const sets = [{ reps: 10, variation: null, time: '09:00' }, { reps: 8, variation: null, time: null }]

describe('SetsCard связанной метрики', () => {
  it('только чтение: подходы списком, ни полей ввода, ни «Добавить подход», ни крестиков; ссылка в «Тренировки»', () => {
    const w = mount(SetsCard, { props: { metric: metric({ source_exercise_id: 'e1' }), sets } })
    expect(w.findAll('[data-test="set-row-readonly"]')).toHaveLength(2)
    expect(w.findAll('[data-test="set-row"]')).toHaveLength(0)
    expect(w.find('input').exists()).toBe(false)
    expect(w.find('button.danger').exists()).toBe(false)
    expect(w.text()).not.toContain('Добавить подход')
    expect(w.text()).toContain('10')
    expect(w.text()).toContain('09:00')
    expect(w.find('[data-test="sets-linked-open"]').attributes('href')).toBe('/workouts/')
  })
  it('несвязанная метрика — как раньше: поля ввода и «Добавить подход»', () => {
    const w = mount(SetsCard, { props: { metric: metric(), sets } })
    expect(w.findAll('[data-test="set-row"]')).toHaveLength(2)
    expect(w.find('[data-test="sets-linked"]').exists()).toBe(false)
    expect(w.findAll('input').length).toBeGreaterThan(0)
  })
})

describe('NumberMetricField связанной метрики', () => {
  it('только итог и ссылка, поля ввода нет (оба режима ввода)', () => {
    for (const input_mode of [undefined, 'add'] as const) {
      const w = mount(NumberMetricField, { props: { metric: metric({ type: 'number', source_exercise_id: 'e1', input_mode }), value: 25 } })
      expect(w.find('input').exists()).toBe(false)
      expect(w.find('[data-test="number-linked-total"]').text()).toContain('25')
      expect(w.find('[data-test="number-linked-open"]').attributes('href')).toBe('/workouts/')
    }
  })
  it('несвязанная — поле ввода на месте', () => {
    const w = mount(NumberMetricField, { props: { metric: metric({ type: 'number' }), value: 3 } })
    expect(w.find('input').exists()).toBe(true)
    expect(w.find('[data-test="number-linked-hint"]').exists()).toBe(false)
  })
})
