import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberMetricField from './components/NumberMetricField.vue'
import type { Metric } from './lib/types'

// Миграция 054 / BACKLOG 19, 30: метрика, связанная с упражнением «Тренировок», на Дашборде — подходы правятся только в «Тренировках» (таблица для чтения);
// добавить новый подход можно прямо здесь быстрым вводом — он уходит в «Тренировки» (BACKLOG 44.5а).
const metric = (o: Partial<Metric> = {}) => ({ id: 'm1', user_id: 'u', name: 'Подтягивания', icon: null, type: 'sets', unit: null, goal_value: null, goal_direction: 'at_least', schedule: null, category_id: null, position: 1, ...o }) as Metric
const sets = [{ reps: 10, variation: null, time: '09:00' }, { reps: 8, variation: null, time: null }]

describe('NumberMetricField связанной метрики', () => {
  it('итог, подпись связи, ссылка и ОДНО поле быстрого ввода (62.1); правки итога нет (оба режима ввода)', () => {
    for (const input_mode of [undefined, 'add'] as const) {
      const w = mount(NumberMetricField, { props: { metric: metric({ type: 'number', source_exercise_id: 'e1', input_mode }), value: 25 } })
      expect(w.findAll('input')).toHaveLength(1)
      expect(w.find('[data-test="number-quick-reps"]').exists()).toBe(true)
      expect(w.find('.fix-btn').exists()).toBe(false)
      expect(w.find('[data-test="linked-badge"]').exists()).toBe(true)
      expect(w.find('[data-test="number-linked-total"]').text()).toContain('25')
      expect(w.find('[data-test="number-linked-open"]').attributes('href')).toBe('/workouts/')
    }
  })
  it('несвязанная — поле ввода на месте', () => {
    const w = mount(NumberMetricField, { props: { metric: metric({ type: 'number' }), value: 3 } })
    expect(w.find('input').exists()).toBe(true)
    expect(w.find('[data-test="number-linked-hint"]').exists()).toBe(false)
    expect(w.find('[data-test="linked-badge"]').exists()).toBe(false)
  })
})
