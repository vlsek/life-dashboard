import { describe, expect, it } from 'vitest'
import { addExercise, addSet, newDraft } from './activeWorkout'
import { draftFromRoutine, loadRoutines, removeRoutine, renameRoutine, routineFromDraft, ROUTINES_KEY, saveRoutines, upsertRoutine } from './routines'

const now = new Date(2026, 9, 31, 20, 0, 0)
const base = () => addSet(addExercise(addExercise(newDraft('d', now), 'a', 'x1'), 'b', 'x2'), 'a') // x1: 2 подхода, x2: 1
const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } } }

describe('рутины', () => {
  it('из тренировки: порядок и число подходов; без названия или без упражнений — null', () => {
    const r = routineFromDraft(base(), 'r1', '  Грудь  ', 'iso')!
    expect(r.name).toBe('Грудь'); expect(r.items.map((i) => [i.exercise_id, i.target_sets])).toEqual([['x1', 2], ['x2', 1]])
    expect(routineFromDraft(base(), 'r1', '   ', 'iso')).toBeNull(); expect(routineFromDraft(newDraft('d', now), 'r1', 'A', 'iso')).toBeNull()
  })
  it('старт из рутины: пустые подходы по шаблону, исчезнувшие упражнения пропускаются, имя тренировки = имя рутины', () => {
    const r = routineFromDraft(base(), 'r1', 'Грудь', 'iso')!
    let n = 0
    const d = draftFromRoutine(r, 's9', now, () => 'id' + n++, new Set(['x1']))
    expect(d.name).toBe('Грудь'); expect(d.exercises).toHaveLength(1); expect(d.exercises[0].sets).toHaveLength(2)
    expect(d.exercises[0].sets.every((s) => s.done === false && s.reps === null)).toBe(true)
  })
  it('добавить/заменить/переименовать/удалить', () => {
    const r = routineFromDraft(base(), 'r1', 'A', 'i')!
    let l = upsertRoutine([], r); l = upsertRoutine(l, { ...r, name: 'B' }); expect(l).toHaveLength(1); expect(l[0].name).toBe('B')
    expect(renameRoutine(l, 'r1', '  C ', 'j')[0]).toMatchObject({ name: 'C', updated_at: 'j' }); expect(renameRoutine(l, 'r1', ' ', 'j')[0].name).toBe('B')
    expect(removeRoutine(l, 'r1')).toEqual([])
  })
  it('хранение: туда-обратно; мусор отбрасывается; ошибка записи → false', () => {
    const s = mem(); const l = [routineFromDraft(base(), 'r1', 'A', 'i')!]
    expect(saveRoutines(l, s)).toBe(true); expect(loadRoutines(s)).toEqual(l)
    s.m.set(ROUTINES_KEY, JSON.stringify([{ id: 1 }, { id: 'a', name: 'ok', items: [{ exercise_id: 'x', target_sets: 99 }, null] }, { id: 'b', name: '', items: [] }]))
    expect(loadRoutines(s)).toEqual([{ id: 'a', name: 'ok', items: [{ exercise_id: 'x', target_sets: 20, superset_group: null }], updated_at: '' }])
    s.m.set(ROUTINES_KEY, '{oops'); expect(loadRoutines(s)).toEqual([])
    expect(saveRoutines(l, { getItem: () => null, setItem: () => { throw new Error('q') } })).toBe(false)
  })
})
