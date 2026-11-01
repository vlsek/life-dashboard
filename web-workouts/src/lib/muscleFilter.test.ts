import { describe, expect, it } from 'vitest'
import { entriesForMuscle, exercisesForMuscle } from './muscleFilter'

const ex = [
  { id: 'bench', name: 'Жим лёжа' },
  { id: 'squat', name: 'Приседания' },
  { id: 'yoga', name: 'Йога' },
]
const en = (id: string, exercise_id: string) => ({ id, exercise_id })

describe('фильтр по мышце (70.4)', () => {
  it('без мышцы — всё как есть', () => {
    expect(exercisesForMuscle(ex, null)).toBe(ex)
    const es = [en('1', 'bench')]
    expect(entriesForMuscle(es, ex, null)).toBe(es)
  })
  it('упражнения: только те, что работают на мышцу; нераспознанное не попадает', () => {
    expect(exercisesForMuscle(ex, 'chest').map((e) => e.id)).toEqual(['bench'])
    expect(exercisesForMuscle(ex, 'quads').map((e) => e.id)).toEqual(['squat'])
    expect(exercisesForMuscle(ex, 'calves')).toEqual([])
  })
  it('записи журнала: только по упражнениям этой мышцы', () => {
    const es = [en('1', 'bench'), en('2', 'squat'), en('3', 'bench'), en('4', 'yoga')]
    expect(entriesForMuscle(es, ex, 'chest').map((e) => e.id)).toEqual(['1', '3'])
    expect(entriesForMuscle(es, ex, 'calves')).toEqual([])
  })
})
