import { describe, expect, it } from 'vitest'
import { addExercise, addSet, newDraft } from './activeWorkout'
import { routineDiffers, updateRoutineFromDraft, duplicateRoutine, draftFromRoutine, loadRoutines, removeRoutine, renameRoutine, routineFromDraft, ROUTINES_KEY, saveRoutines, upsertRoutine } from './routines'

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

describe('рутины: дублирование', () => {
  const base = { id: 'a', name: 'Грудь', updated_at: '2026-01-01', items: [{ exercise_id: 'e1', target_sets: 3, superset_group: null }] }
  it('копия идёт сразу после оригинала, с новым id и пометкой; пункты не общие', () => {
    const { list, copy } = duplicateRoutine([base, { ...base, id: 'b', name: 'Ноги' }], 'a', 'n1', '(копия)', '2026-02-01')
    expect(list.map((r) => r.id)).toEqual(['a', 'n1', 'b'])
    expect(copy).toMatchObject({ id: 'n1', name: 'Грудь (копия)', updated_at: '2026-02-01' })
    copy!.items[0].target_sets = 9
    expect(base.items[0].target_sets).toBe(3)
  })
  it('длинное название укорачивается до 80; нет рутины — ничего не меняется', () => {
    const long = { ...base, name: 'x'.repeat(80) }
    expect(duplicateRoutine([long], 'a', 'n', '(copy)', '').copy!.name.length).toBeLessThanOrEqual(80)
    expect(duplicateRoutine([base], 'zzz', 'n', 's', '').copy).toBeNull()
  })
})

describe('рутины: обновить под тренировку', () => {
  const r = { id: 'a', name: 'Грудь', updated_at: '2026-01-01', items: [{ exercise_id: 'e1', target_sets: 3, superset_group: null }] }
  const draftWith = (n: number, ex = 'e1') => { let d = addExercise(newDraft('d', new Date(), { routine_id: 'a' }), 'x1', ex); for (let i = 1; i < n; i++) d = addSet(d, 'x1'); return d }
  it('те же упражнения и подходы — различий нет; другое число подходов или другое упражнение — есть', () => {
    expect(routineDiffers(r, draftWith(3))).toBe(false)
    expect(routineDiffers(r, draftWith(5))).toBe(true)
    expect(routineDiffers(r, draftWith(3, 'e2'))).toBe(true)
  })
  it('обновление меняет состав и updated_at только у нужной рутины', () => {
    const other = { ...r, id: 'b' }
    const out = updateRoutineFromDraft([r, other], 'a', draftWith(5), '2026-03-01')
    expect(out[0]).toMatchObject({ updated_at: '2026-03-01', items: [{ exercise_id: 'e1', target_sets: 5 }] })
    expect(out[1]).toEqual(other)
  })
})
