import { describe, expect, it } from 'vitest'
import { HEAT_LEVELS, coveredMuscles, heatLevel, normalizeHeatMode, setsByMuscle } from './muscleHeat'

const ex = [
  { id: 'bench', name: 'Жим лёжа' },
  { id: 'squat', name: 'Приседания' },
  { id: 'yoga', name: 'Йога' },
]
const set = { reps: 10, weight: 50, time: null, duration: null, side: null }
const e = (exercise_id: string, date: string, n = 1) => ({ exercise_id, date, sets: Array.from({ length: n }, () => set) }) as never

describe('тепловая карта: чистая логика (70.3)', () => {
  it('режим: мусор → recent', () => {
    expect(normalizeHeatMode('volume')).toBe('volume')
    expect(normalizeHeatMode('x')).toBe('recent')
    expect(normalizeHeatMode(null)).toBe('recent')
  })
  it('подходы по мышцам: окно включает границы, пустые и будущие записи не считаются', () => {
    const m = setsByMuscle([e('bench', '2026-09-24', 3), e('bench', '2026-09-23', 5), e('bench', '2026-10-01', 2), e('squat', '2026-09-30', 0), e('squat', '2026-09-30', 4)], ex, '2026-09-30', '2026-09-24')
    expect(m.get('chest')).toBe(3)
    expect(m.get('quads')).toBe(4)
    expect(m.has('calves')).toBe(false)
  })
  it('охват: только группы упражнений человека; неизвестное упражнение ничего не добавляет', () => {
    const c = coveredMuscles(ex)
    expect(c.has('chest')).toBe(true)
    expect(c.has('quads')).toBe(true)
    expect(c.has('calves')).toBe(false)
    expect(coveredMuscles([]).size).toBe(0)
  })
  it('ступени: 0 — нет данных, максимум — верхняя, малое значение — не меньше первой', () => {
    expect(heatLevel(0, 10)).toBe(0)
    expect(heatLevel(5, 0)).toBe(0)
    expect(heatLevel(10, 10)).toBe(HEAT_LEVELS)
    expect(heatLevel(1, 100)).toBe(1)
    expect(heatLevel(50, 100)).toBe(2)
    expect(heatLevel(51, 100)).toBe(3)
  })
})
