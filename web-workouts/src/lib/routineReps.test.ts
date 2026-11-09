import { describe, it, expect } from 'vitest'
import { draftFromRoutine, repsRangeOf, repsTargetText, routineFromDraft, updateRoutineFromDraft, routineDiffers, loadRoutines, type Routine } from './routines'
import { routineRow, itemRows, routinesFromRemote } from './routineSync'
import { newDraft } from './activeWorkout'
import { repsFields } from './sessionContract'

const S = (reps: number | null, o: Record<string, unknown> = {}) => ({ reps, weight: 50, time: null, duration: null, side: null, done: true, ...o }) as never

describe('цель повторов в рутине (69.7)', () => {
  it('repsRangeOf: только выполненные рабочие, разминка и пустые не считаются', () => {
    expect(repsRangeOf([S(10), S(8), S(12, { type: 'warmup' }), S(20, { done: false }), S(null)])).toEqual({ reps_min: 8, reps_max: 10 })
    expect(repsRangeOf([S(null)])).toBeNull()
  })
  it('repsTargetText и repsFields', () => {
    expect(repsTargetText(8, 10)).toBe('8–10')
    expect(repsTargetText(8, 8)).toBe('8')
    expect(repsTargetText(null, null)).toBe('')
    expect(repsFields(8, 5)).toEqual({ reps_min: 8, reps_max: 8 })
    expect(repsFields('x', 5)).toEqual({})
    expect(repsFields(0, 5)).toEqual({})
  })
  const draftWith = () => { const d = newDraft('d1', new Date('2026-11-09T10:00:00Z')); d.exercises = [{ id: 'x1', exercise_id: 'e1', superset_group: null, note: null, sets: [S(10), S(8)] }, { id: 'x2', exercise_id: 'e2', superset_group: null, note: null, sets: [S(null, { done: false })] }]; return d }
  it('сохранение из тренировки пишет диапазон; у упражнения без повторов — нет', () => {
    const r = routineFromDraft(draftWith(), 'r1', 'Верх', '2026-11-09')!
    expect(r.items[0]).toMatchObject({ reps_min: 8, reps_max: 10 })
    expect('reps_min' in r.items[1]).toBe(false)
  })
  it('старт из рутины переносит цель в упражнение черновика; невыполненное упражнение сохраняет прежнюю цель', () => {
    const r: Routine = { id: 'r1', name: 'Верх', updated_at: 'a', items: [{ exercise_id: 'e1', target_sets: 2, superset_group: null, reps_min: 8, reps_max: 10 }] }
    const d = draftFromRoutine(r, 'd', new Date(), () => 'id1', new Set(['e1']))
    expect(d.exercises[0]).toMatchObject({ reps_min: 8, reps_max: 10 })
    expect(updateRoutineFromDraft([r], 'r1', d, 'b')[0].items[0]).toMatchObject({ reps_min: 8, reps_max: 10 })
    expect(routineDiffers(r, d)).toBe(false) // цель повторов сама по себе не вызывает вопрос «обновить рутину?»
  })
  it('синхронизация: колонки reps_min/reps_max туда и обратно', () => {
    const r: Routine = { id: 'r1', name: 'A', updated_at: 'a', items: [{ exercise_id: 'e1', target_sets: 3, superset_group: null, reps_min: 6, reps_max: 8 }, { exercise_id: 'e2', target_sets: 3, superset_group: null }] }
    const rows = itemRows('u', r, () => 'n')
    expect(rows.map((x) => [x.reps_min, x.reps_max])).toEqual([[6, 8], [null, null]])
    expect(routineRow('u', r, 0).id).toBe('r1')
    const back = routinesFromRemote([{ id: 'r1', name: 'A' }], rows.map((x, k) => ({ ...x, position: k })))
    expect(back[0].items[0]).toMatchObject({ reps_min: 6, reps_max: 8 })
    expect('reps_min' in back[0].items[1]).toBe(false)
  })
  it('localStorage не теряет цель', () => {
    const store = { getItem: () => JSON.stringify([{ id: 'r', name: 'A', updated_at: '', items: [{ exercise_id: 'e', target_sets: 3, superset_group: null, reps_min: 5, reps_max: 7 }] }]) } as unknown as Storage
    expect(loadRoutines(store)[0].items[0]).toMatchObject({ reps_min: 5, reps_max: 7 })
  })
})
