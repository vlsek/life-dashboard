import type { SetV2 } from './sessionContract'
import { describe, expect, it } from 'vitest'
import { addExercise, addSet, canSave, doneSetCount, elapsedSeconds, finishDraft, formatElapsed, loadDraft, moveExercise, newDraft, removeExercise, removeSet, saveDraft, setSetType, toggleDone, updateSet, workingDoneSets, DRAFT_KEY } from './activeWorkout'

const start = new Date(2026, 9, 30, 9, 0, 0)
const mk = () => addExercise(addExercise(newDraft('s1', start, { name: ' Грудь ' }), 'e1', 'x1'), 'e2', 'x2')
const mem = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) } } }

describe('черновик', () => {
  it('старт: локальная дата, имя без пробелов, у упражнения один пустой подход', () => {
    const d = mk(); expect(d.date).toBe('2026-10-30'); expect(d.name).toBe('Грудь')
    expect(d.exercises[0].sets).toHaveLength(1); expect(d.exercises[0].sets[0].done).toBe(false)
  })
  it('«+ подход» копирует числа, но не «выполнен» и не разминку', () => {
    let d = mk(); d = updateSet(d, 'e1', 0, { reps: 8, weight: 60, type: 'warmup' }); d = toggleDone(d, 'e1', 0); d = addSet(d, 'e1')
    expect(d.exercises[0].sets[1]).toMatchObject({ reps: 8, weight: 60, done: false }); expect(d.exercises[0].sets[1].type).toBeUndefined()
  })
  it('неизвестное упражнение/подход — тот же объект; порядок и удаление', () => {
    const d = mk()
    expect(toggleDone(d, 'nope', 0)).toBe(d); expect(updateSet(d, 'e1', 5, { reps: 1 })).toBe(d); expect(moveExercise(d, 'e1', -1)).toBe(d)
    expect(moveExercise(d, 'e1', 1).exercises.map(e => e.id)).toEqual(['e2', 'e1']); expect(removeExercise(d, 'e1').exercises).toHaveLength(1)
    expect(removeSet(d, 'e1', 0).exercises[0].sets).toHaveLength(0)
  })
})

describe('завершение', () => {
  it('без выполненного подхода с числами не сохраняется', () => {
    let d = mk(); expect(canSave(d)).toBe(false)
    d = toggleDone(d, 'e1', 0); expect(canSave(d)).toBe(false) // галочка без повторов — пусто
    expect(finishDraft(d, '2026-10-30T10:00:00Z')).toEqual({ session: null, entries: [] })
  })
  it('в запись идут только выполненные подходы; пустые упражнения пропускаются; position — среди сохранённых', () => {
    let d = mk(); d = addExercise(d, 'e3', 'x3')
    d = updateSet(d, 'e3', 0, { reps: 10, weight: 20 }); d = toggleDone(d, 'e3', 0); d = addSet(d, 'e3') // второй не выполнен
    const r = finishDraft(d, new Date(2026, 9, 30, 10, 0, 0).toISOString())
    expect(r.entries.map(e => [e.id, e.position, e.session_id])).toEqual([['e3', 0, 's1']]); expect(r.entries[0].sets).toHaveLength(1); expect(r.entries[0].sets[0].done).toBe(true)
    expect(r.session).toMatchObject({ id: 's1', source: 'live', name: 'Грудь', date: '2026-10-30' })
  })
  it('без таблицы сессий — записи старого формата без session_id', () => {
    let d = mk(); d = updateSet(d, 'e1', 0, { reps: 5 }); d = toggleDone(d, 'e1', 0)
    const r = finishDraft(d, start.toISOString(), false)
    expect(r.session).toBeNull(); expect(r.entries[0]).toMatchObject({ session_id: null, position: null, superset_group: null })
  })
  it('конец не раньше начала; разминка считается выполненной, но не рабочей', () => {
    let d = mk(); d = updateSet(d, 'e1', 0, { reps: 5, weight: 40 }); d = toggleDone(d, 'e1', 0); d = setSetType(d, 'e1', 0, 'warmup')
    expect(doneSetCount(d)).toBe(1); expect(workingDoneSets(d)).toBe(0)
    expect(finishDraft(d, '2000-01-01T00:00:00Z').session!.finished_at).toBe(d.started_at)
    expect(setSetType(d, 'e1', 0, 'normal').exercises[0].sets[0].type).toBeNull()
  })
})

describe('время и хранение', () => {
  it('секундомер и формат', () => {
    const d = mk(); expect(elapsedSeconds(d, start.getTime() + 2530_000)).toBe(2530); expect(elapsedSeconds(d, start.getTime() - 5000)).toBe(0)
    expect(formatElapsed(2530)).toBe('42:10'); expect(formatElapsed(3909)).toBe('1:05:09'); expect(formatElapsed(2530, true)).toBe('0:42:10')
  })
  it('сохранение и загрузка; мусор и чужой формат → null; нет storage → false', () => {
    const s = mem(); const d = mk(); expect(saveDraft(d, s)).toBe(true); expect(loadDraft(s)).toEqual(d)
    s.m.set(DRAFT_KEY, '{oops'); expect(loadDraft(s)).toBeNull(); s.m.set(DRAFT_KEY, JSON.stringify({ v: 2 })); expect(loadDraft(s)).toBeNull()
    saveDraft(null, s); expect(s.m.has(DRAFT_KEY)).toBe(false)
    expect(saveDraft(d, { getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('quota') } })).toBe(false)
  })
})

import { entryRow, previousSet, previousText } from './activeWorkout'
describe('строки для БД и подсказка «прошлый раз»', () => {
  const base = { id: 'e', exercise_id: 'x', date: '2026-10-30', sets: [], notes: null, session_id: 's', position: 0, superset_group: null }
  it('без таблицы сессий колонок v2 в строке нет вовсе', () => {
    expect(entryRow('u', base, false)).not.toHaveProperty('session_id')
    expect(entryRow('u', base, true)).toMatchObject({ session_id: 's', position: 0, user_id: 'u' })
  })
  it('подсказка: последняя запись ДО даты, рабочие подходы по номеру; разминка не считается', () => {
    const e = (date: string, sets: object[]) => ({ exercise_id: 'x', date, sets: sets as never })
    const entries = [e('2026-10-10', [{ reps: 5, weight: 50 }]), e('2026-10-20', [{ reps: 10, weight: 20, type: 'warmup' }, { reps: 8, weight: 60 }, { reps: 6, weight: 65 }]), e('2026-10-30', [{ reps: 1, weight: 1 }])]
    expect(previousSet(entries, 'x', '2026-10-30', 0)).toMatchObject({ reps: 8, weight: 60 })
    expect(previousSet(entries, 'x', '2026-10-30', 2)).toBeNull()
    expect(previousSet(entries, 'y', '2026-10-30', 0)).toBeNull()
    expect(previousText({ reps: 8, weight: 60, time: null, duration: null, side: null }, 'kg')).toBe('60kg×8')
  })
})

import { applyPrevious, fillAllPrevious } from './activeWorkout'
describe('подстановка прошлого', () => {
  const prev = (r: number, w: number): SetV2 => ({ reps: r, weight: w, time: null, duration: null, side: null })
  it('в подход попадают числа, но не «выполнен»; без прошлого — тот же объект', () => {
    let d = addExercise(newDraft('s', new Date(2026, 9, 31)), 'e1', 'x')
    const r = applyPrevious(d, 'e1', 0, prev(8, 60))
    expect(r.exercises[0].sets[0]).toMatchObject({ reps: 8, weight: 60, done: false }); expect(applyPrevious(d, 'e1', 0, null)).toBe(d)
  })
  it('для всех: только пустые, лишние берут последний прошлый, введённое не затирается', () => {
    let d = addExercise(newDraft('s', new Date(2026, 9, 31)), 'e1', 'x')
    d = addSet(addSet(d, 'e1'), 'e1') // 3 подхода (копия пустого — пустые)
    d = updateSet(d, 'e1', 1, { reps: 5, weight: 100 })
    const r = fillAllPrevious(d, 'e1', (i) => (i === 0 ? prev(8, 60) : null))
    expect(r.exercises[0].sets.map((s) => [s.reps, s.weight])).toEqual([[8, 60], [5, 100], [8, 60]])
  })
})
