import { describe, expect, it } from 'vitest'
import { progressionHint } from './progressionHint'

const s = (weight: number | null, reps: number | null) => ({ reps, weight, time: null, duration: null, side: null })
describe('подсказка прогрессии', () => {
  it('все подходы на верхней границе → прибавить вес (кг +2,5, lb +5)', () => {
    expect(progressionHint([s(60, 10), s(60, 10), s(60, 12)], 'kg')).toEqual({ kind: 'weight', sets: 3, reps: 10, weight: 60, next: 62.5 })
    expect(progressionHint([s(135, 10)], 'lb')).toMatchObject({ kind: 'weight', next: 140 })
  })
  it('иначе тот же вес и на повтор больше слабого подхода', () => {
    expect(progressionHint([s(60, 10), s(60, 8)], 'kg')).toEqual({ kind: 'reps', sets: 2, reps: 8, weight: 60, next: 9 })
  })
  it('считается по самому тяжёлому весу; лёгкие подходы не мешают', () => {
    expect(progressionHint([s(40, 20), s(60, 6)], 'kg')).toMatchObject({ kind: 'reps', weight: 60, sets: 1, next: 7 })
  })
  it('без веса/повторов — подсказки нет', () => {
    expect(progressionHint([], 'kg')).toBeNull()
    expect(progressionHint([s(null, 12), s(0, 5), s(50, null)], 'kg')).toBeNull()
  })
})
