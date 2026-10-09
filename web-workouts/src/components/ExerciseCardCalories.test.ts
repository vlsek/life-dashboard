import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// BACKLOG 44.5е: калории на карточке упражнения. Нет веса в метриках тела — не выдумываем число, а подсказываем, где его указать.
vi.mock('../lib/supabase', () => ({ sb: {}, logout: vi.fn() }))

import ExerciseCard from './ExerciseCard.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

const exercise: Exercise = {
  id: 'e1', user_id: 'u1', name: 'Приседания', category: 'lower',
  tracks_weight: false, value_label: null, unit: null, suggested_scheme: null, created_at: '2026-01-01',
} as Exercise
const entry = (sets: WorkoutEntry['sets']): WorkoutEntry[] => [{ id: 'x', user_id: 'u1', exercise_id: 'e1', date: '2026-10-06', notes: null, sets }]
const sets10 = Array.from({ length: 10 }, () => ({ reps: 10, weight: null, time: null, duration: null, side: null }))

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
})

describe('ExerciseCard: калории', () => {
  it('вес известен — «≈ N ккал»', () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: entry(sets10), bodyWeightKg: 70 } })
    expect(w.find('[data-testid="exercise-calories"]').text()).toContain('≈ 64')
    expect(w.find('[data-testid="exercise-calories-need-weight"]').exists()).toBe(false)
  })
  it('веса нет, записи есть — вместо числа подсказка про метрики тела', () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: entry(sets10), bodyWeightKg: null } })
    expect(w.find('[data-testid="exercise-calories"]').exists()).toBe(false)
    expect(w.find('[data-testid="exercise-calories-need-weight"]').text()).toContain('вес')
    const w2 = mount(ExerciseCard, { props: { exercise, entries: entry(sets10) } })
    expect(w2.find('[data-testid="exercise-calories-need-weight"]').exists()).toBe(true)
  })
  it('записей нет — ни числа, ни подсказки', () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: [], bodyWeightKg: null } })
    expect(w.find('[data-testid="exercise-calories"]').exists()).toBe(false)
    expect(w.find('[data-testid="exercise-calories-need-weight"]').exists()).toBe(false)
  })
})
