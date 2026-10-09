import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// BACKLOG 44.5а: кольцо «подходов из N» на карточке упражнения, связанного с метрикой дня (план — metrics.planned_sets_log, миграция 041).
vi.mock('./lib/supabase', () => ({ sb: {}, logout: vi.fn() }))

import ExerciseCard from './components/ExerciseCard.vue'
import SetsRing from './components/SetsRing.vue'
import { plannedSetsOn, type LinkedMetric } from './lib/metricLink'
import { todayStr } from './lib/date'
import type { Exercise, WorkoutEntry } from './lib/types'

const exercise = {
  id: 'e1', user_id: 'u1', name: 'Отжимания', category: 'upper', tracks_weight: false,
  value_label: null, unit: null, suggested_scheme: null, created_at: '2026-01-01',
} as Exercise
const todayEntry = (n: number): WorkoutEntry[] => [{
  id: 'x', user_id: 'u1', exercise_id: 'e1', date: todayStr(), notes: null,
  sets: Array.from({ length: n }, () => ({ reps: 10, weight: null, time: null, duration: null, side: null })),
}]
const metric = (log: unknown): LinkedMetric => ({ id: 'm1', name: 'Отжимания', icon: null, type: 'sets', goal_value: null, source_exercise_id: 'e1', planned_sets_log: log })

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('plannedSetsOn', () => {
  const log = [{ from: '2026-10-01', n: 3 }, { from: '2026-10-10', n: 4 }, { from: '2026-10-20', n: null }]
  it('берёт последнюю запись журнала с from <= даты', () => {
    expect(plannedSetsOn(log, '2026-09-30')).toBeNull()
    expect(plannedSetsOn(log, '2026-10-01')).toBe(3)
    expect(plannedSetsOn(log, '2026-10-09')).toBe(3)
    expect(plannedSetsOn(log, '2026-10-10')).toBe(4)
    expect(plannedSetsOn(log, '2026-10-19')).toBe(4)
  })
  it('n=null снимает план; порядок записей не важен', () => {
    expect(plannedSetsOn(log, '2026-10-25')).toBeNull()
    expect(plannedSetsOn([...log].reverse(), '2026-10-12')).toBe(4)
  })
  it('мусор и нет колонки — плана нет', () => {
    expect(plannedSetsOn(undefined, '2026-10-12')).toBeNull()
    expect(plannedSetsOn(null, '2026-10-12')).toBeNull()
    expect(plannedSetsOn('x', '2026-10-12')).toBeNull()
    expect(plannedSetsOn([null, 1, { from: 5, n: 3 }, { from: '2026-10-01', n: 0 }, { from: '2026-10-02', n: 2.5 }], '2026-10-12')).toBeNull()
  })
})

describe('SetsRing', () => {
  it('2 из 4: дуга наполовину, не завершено, текст и подпись', () => {
    const w = mount(SetsRing, { props: { done: 2, planned: 4 } })
    expect(w.text()).toContain('2/4')
    expect(w.attributes('aria-label')).toBe('Подходов сегодня: 2 из 4 по плану')
    expect(w.attributes('data-complete')).toBe('false')
    const arc = w.find('[data-testid="sets-ring-arc"]')
    const c = Number(arc.attributes('stroke-dasharray'))
    expect(Number(arc.attributes('stroke-dashoffset'))).toBeCloseTo(c / 2, 5)
  })
  it('план выполнен или перевыполнен — кольцо полное и «завершено»', () => {
    const w = mount(SetsRing, { props: { done: 6, planned: 4 } })
    expect(w.attributes('data-complete')).toBe('true')
    expect(Number(w.find('[data-testid="sets-ring-arc"]').attributes('stroke-dashoffset'))).toBe(0)
  })
  it('0 из 4 — пустая дуга', () => {
    const w = mount(SetsRing, { props: { done: 0, planned: 4 } })
    const arc = w.find('[data-testid="sets-ring-arc"]')
    expect(Number(arc.attributes('stroke-dashoffset'))).toBeCloseTo(Number(arc.attributes('stroke-dasharray')), 5)
  })
})

describe('ExerciseCard: кольцо подходов', () => {
  const log = [{ from: '2020-01-01', n: 4 }]
  it('связанная метрика с планом — кольцо «сегодня сделано / N»', () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: todayEntry(3), linkedMetrics: [metric(log)] } })
    expect(w.find('[data-testid="sets-ring"]').exists()).toBe(true)
    expect(w.find('[data-testid="sets-ring"]').text()).toContain('3/4')
  })
  it('нет плана / нет колонки / нет связи — кольца нет, строка про метрику как была', () => {
    const a = mount(ExerciseCard, { props: { exercise, entries: todayEntry(3), linkedMetrics: [metric(null)] } })
    expect(a.find('[data-testid="sets-ring"]').exists()).toBe(false)
    expect(a.find('[data-testid="exercise-metric-chip"]').exists()).toBe(true)
    const b = mount(ExerciseCard, { props: { exercise, entries: todayEntry(3), linkedMetrics: [metric(undefined)] } })
    expect(b.find('[data-testid="sets-ring"]').exists()).toBe(false)
    const c = mount(ExerciseCard, { props: { exercise, entries: todayEntry(3), linkedMetrics: [] } })
    expect(c.find('[data-testid="sets-ring"]').exists()).toBe(false)
    expect(c.find('[data-testid="exercise-metric-chip"]').exists()).toBe(false)
  })
  it('вчерашние подходы в кольцо не попадают', () => {
    const old: WorkoutEntry[] = [{ id: 'y', user_id: 'u1', exercise_id: 'e1', date: '2020-02-02', notes: null, sets: [{ reps: 10, weight: null, time: null, duration: null, side: null }] }]
    const w = mount(ExerciseCard, { props: { exercise, entries: old, linkedMetrics: [metric(log)] } })
    expect(w.find('[data-testid="sets-ring"]').text()).toContain('0/4')
  })
})
