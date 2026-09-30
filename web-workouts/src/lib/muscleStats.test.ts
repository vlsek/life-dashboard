import { describe, expect, it } from 'vitest'
import { isTrainedRecently, lastTrainedByMuscle, trainingDaysByMuscle, unmappedExercises } from './muscleStats'

const ex = [
  { id: 'bench', name: 'Жим лёжа' },
  { id: 'squat', name: 'Приседания' },
  { id: 'yoga', name: 'Йога' },
]
const set = [{ reps: 10, weight: 50, time: null, duration: null, side: null }]
const en = (exercise_id: string, date: string, sets = set) => ({ exercise_id, date, sets })
const TODAY = '2026-09-30'

describe('isTrainedRecently — окно 4 дня включает сегодня', () => {
  it('граница: сегодня и 3 дня назад — да, 4 дня назад — нет', () => {
    expect(isTrainedRecently('2026-09-30', TODAY)).toBe(true)
    expect(isTrainedRecently('2026-09-27', TODAY)).toBe(true)
    expect(isTrainedRecently('2026-09-26', TODAY)).toBe(false)
  })
  it('нет даты или дата из будущего — нет', () => {
    expect(isTrainedRecently(undefined, TODAY)).toBe(false)
    expect(isTrainedRecently('2026-10-01', TODAY)).toBe(false)
  })
  it('корректно переходит через границу месяца/года', () => {
    expect(isTrainedRecently('2025-12-30', '2026-01-02')).toBe(true)
    expect(isTrainedRecently('2025-12-29', '2026-01-02')).toBe(false)
  })
})

describe('lastTrainedByMuscle', () => {
  it('берёт самую позднюю дату по каждой мышце упражнения', () => {
    const last = lastTrainedByMuscle([en('bench', '2026-09-20'), en('bench', '2026-09-28')], ex, TODAY)
    expect(last.chest).toBe('2026-09-28')
    expect(last.triceps).toBe('2026-09-28')
    expect(last.quads).toBeUndefined()
  })
  it('запись без подходов и запись из будущего не считаются', () => {
    const last = lastTrainedByMuscle([en('squat', '2026-09-29', []), en('squat', '2026-10-05')], ex, TODAY)
    expect(last.quads).toBeUndefined()
  })
  it('запись неизвестного упражнения безопасна', () => {
    expect(lastTrainedByMuscle([en('yoga', '2026-09-29'), en('ghost', '2026-09-29')], ex, TODAY)).toEqual({})
  })
})

describe('trainingDaysByMuscle', () => {
  const entries = [en('bench', '2026-09-28'), en('bench', '2026-09-28'), en('bench', '2026-09-25'), en('squat', '2026-09-29'), en('bench', '2026-08-01')]
  it('считает разные дни, а не записи; сортирует по убыванию; старше окна не берёт', () => {
    const res = trainingDaysByMuscle(entries, ex, TODAY, '2026-09-01')
    const chest = res.find((r) => r.muscle === 'chest')
    expect(chest?.days).toBe(2) // 28 и 25 сентября; 1 августа вне окна
    expect(res[0].days).toBeGreaterThanOrEqual(res[res.length - 1].days)
    expect(res.find((r) => r.muscle === 'quads')?.days).toBe(1)
  })
  it('пустая история — пустой список', () => {
    expect(trainingDaysByMuscle([], ex, TODAY, '2026-09-01')).toEqual([])
  })
})

describe('unmappedExercises', () => {
  it('возвращает упражнения без привязки к мышцам', () => {
    expect(unmappedExercises(ex).map((e) => e.id)).toEqual(['yoga'])
  })
})
