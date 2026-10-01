import { describe, expect, it } from 'vitest'
import { bestSetRecord, formatSets } from './lib/workouts'
import type { Exercise, WorkoutEntry, WorkoutSet } from './lib/types'

const ex = (o: Partial<Exercise>): Exercise => ({ id: 'e1', user_id: 'u', name: 'Push-ups', category: 'upper', tracks_weight: false, unit: null, value_label: null, created_at: '', ...o }) as unknown as Exercise
const set = (o: Partial<WorkoutSet>): WorkoutSet => ({ reps: 10, weight: null, duration: null, side: null, time: null, ...o }) as WorkoutSet
const entry = (sets: WorkoutSet[]): WorkoutEntry => ({ id: 'w1', exercise_id: 'e1', date: '2026-10-01', sets, notes: null }) as unknown as WorkoutEntry

// BACKLOG 18: «добавляю отжимания просто раз, а в итоге всё равно пишет кг»
describe('упражнение без веса: «кг» не дописывается к повторениям', () => {
  it('подходы: «10, 12», а не «10 кг, 12 кг» — даже если старая форма сохранила unit «кг»', () => {
    const e = ex({ unit: 'кг' })
    expect(formatSets([set({ reps: 10 }), set({ reps: 12 })], e, '/ч', 'мин', 'кг')).toBe('10, 12')
  })
  it('рекорд: «15», а не «15 кг»', () => {
    const r = bestSetRecord([entry([set({ reps: 15 }), set({ reps: 9 })])], ex({ unit: 'kg' }), 'kg')
    expect(r?.text).toBe('15')
  })
  it('невесовая единица («раз») по-прежнему показывается', () => {
    const e = ex({ unit: 'раз' })
    expect(formatSets([set({ reps: 10 })], e, '/ч', 'мин', 'кг')).toBe('10 раз')
    expect(bestSetRecord([entry([set({ reps: 10 })])], e, 'кг')?.text).toBe('10 раз')
  })
  it('утяжеление (доп. вес) по-прежнему в весовых единицах: «10 (+5кг)»', () => {
    expect(formatSets([set({ reps: 10, weight: 5 })], ex({ unit: 'кг' }), '/ч', 'мин', 'кг')).toBe('10 (+5кг)')
  })
})

describe('упражнение с весом: без изменений', () => {
  it('«10×50кг» и рекорд «5×60кг»', () => {
    const e = ex({ tracks_weight: true, unit: 'кг' })
    expect(formatSets([set({ reps: 10, weight: 50 })], e, '/ч', 'мин', 'кг')).toBe('10×50кг')
    expect(bestSetRecord([entry([set({ reps: 5, weight: 60 }), set({ reps: 10, weight: 50 })])], e, 'кг')?.text).toBe('5×60кг')
  })
  it('единица lb берётся из упражнения', () => {
    const e = ex({ tracks_weight: true, unit: 'lb' })
    expect(formatSets([set({ reps: 8, weight: 135 })], e, '/ч', 'мин', 'кг')).toBe('8×135lb')
  })
})
