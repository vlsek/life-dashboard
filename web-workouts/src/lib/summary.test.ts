import { describe, expect, it } from 'vitest'
import { addExercise, newDraft, toggleDone, updateSet } from './activeWorkout'
import { fmtVolume, summarize } from './summary'
import type { Exercise, WorkoutEntry } from './types'

const ex = (id: string, mg: string[] | null = null): Exercise => ({ id, user_id: 'u', name: id, category: null, tracks_weight: true, value_label: null, unit: null, suggested_scheme: null, muscle_groups: mg, created_at: '2026-01-01' })
const old = (exercise_id: string, weight: number): WorkoutEntry => ({ id: 'o' + exercise_id, user_id: 'u', exercise_id, date: '2026-01-01', sets: [{ reps: 8, weight, time: null, duration: null, side: null }], notes: null })
const start = new Date(2026, 9, 31, 9, 0, 0)
function draft() {
  let d = addExercise(addExercise(newDraft('s', start), 'a', 'x1'), 'b', 'x2')
  d = updateSet(d, 'a', 0, { reps: 8, weight: 65 }); d = toggleDone(d, 'a', 0)
  d = updateSet(d, 'b', 0, { reps: 10, weight: 20 }) // не выполнен
  return d
}
describe('итоги тренировки', () => {
  it('считает только выполненное: упражнения, рабочие подходы, объём, минуты, мышцы', () => {
    const s = summarize(draft(), [ex('x1', ['chest', 'triceps']), ex('x2', ['back'])], [], start.getTime() + 47 * 60000)
    expect(s).toMatchObject({ minutes: 47, exerciseCount: 1, workingSets: 1, volume: 520, muscles: ['chest', 'triceps'] })
  })
  it('рекорд попадает в итоги, если до этого была история и вес выше; без истории — нет', () => {
    const e = [ex('x1')]
    expect(summarize(draft(), e, [old('x1', 60)], start.getTime()).records).toMatchObject([{ exerciseId: 'x1', kind: 'weight', weight: 65, reps: 8 }])
    expect(summarize(draft(), e, [], start.getTime()).records).toEqual([])
    expect(summarize(draft(), e, [old('x1', 65)], start.getTime()).records).toEqual([])
  })
  it('формат объёма', () => { expect(fmtVolume(1250)).toBe('1 250'); expect(fmtVolume(52.5)).toBe('52,5'); expect(fmtVolume(0)).toBe('0') })
})
