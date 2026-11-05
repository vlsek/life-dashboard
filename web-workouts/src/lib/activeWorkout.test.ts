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

import { nextSupersetTarget, stepNumber, weightStep, entryRow, lastNote, setExerciseNote, previousSet, previousText } from './activeWorkout'
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

import { newPastDraft } from './activeWorkout'
describe('тренировка задним числом', () => {
  it('дата/время/длительность → черновик с manual_minutes; конец = начало + длительность, source manual', () => {
    const d = newPastDraft('p', '2026-10-25', '18:30', 75)!
    expect(d.date).toBe('2026-10-25'); expect(d.manual_minutes).toBe(75); expect(elapsedSeconds(d, Date.now())).toBe(4500)
    let x = addExercise(d, 'e', 'x'); x = updateSet(x, 'e', 0, { reps: 5, weight: 50 }); x = toggleDone(x, 'e', 0)
    const r = finishDraft(x, new Date().toISOString())
    expect(r.session!.source).toBe('manual'); expect(Date.parse(r.session!.finished_at) - Date.parse(r.session!.started_at)).toBe(75 * 60000)
    expect(r.session!.date).toBe('2026-10-25'); expect(r.entries[0].date).toBe('2026-10-25')
  })
  it('мусор → null; manual_minutes переживает сохранение', () => {
    expect(newPastDraft('p', '2026-02-30', '10:00', 30)).toBeNull(); expect(newPastDraft('p', '2026-10-25', '25:00', 30)).toBeNull()
    expect(newPastDraft('p', '2026-10-25', '10:00', 0)).toBeNull(); expect(newPastDraft('p', 'x', '10:00', 30)).toBeNull()
    const s = { m: new Map<string, string>(), getItem(k: string) { return this.m.get(k) ?? null }, setItem(k: string, v: string) { this.m.set(k, v) }, removeItem(k: string) { this.m.delete(k) } }
    const d = newPastDraft('p', '2026-10-25', '10:00', 30)!; saveDraft(d, s); expect(loadDraft(s)!.manual_minutes).toBe(30)
  })
})

import { draftFromLast, lastWorkoutDate } from './activeWorkout'
describe('повторить прошлую', () => {
  const en = (id: string, exercise_id: string, date: string, n: number, x: object = {}) => ({ id, exercise_id, date, sets: Array.from({ length: n }, () => ({ reps: 5, weight: 50, time: null, duration: null, side: null }) as SetV2), ...x })
  it('берёт упражнения самого свежего дня по порядку; подходов столько же, разминка не в счёт; пропавшие упражнения пропускаются', () => {
    const list = [en('1', 'a', '2026-10-20', 3), en('2', 'b', '2026-10-25', 2, { position: 1 }), en('3', 'a', '2026-10-25', 4, { position: 0 }), en('4', 'gone', '2026-10-25', 3)]
    let n = 0
    const d = draftFromLast(list, new Set(['a', 'b']), 'd', new Date(2026, 10, 1), () => 'id' + n++)!
    expect(d.exercises.map((e) => [e.exercise_id, e.sets.length])).toEqual([['a', 4], ['b', 2]])
    expect(d.exercises[0].sets.every((s) => s.reps === null && s.done === false)).toBe(true)
    const w = [{ ...en('5', 'a', '2026-10-26', 3), sets: [{ reps: 8, weight: 20, type: 'warmup' }, { reps: 5, weight: 50 }] as SetV2[] }]
    expect(draftFromLast(w as never, new Set(['a']), 'd', new Date(), () => 'x')!.exercises[0].sets).toHaveLength(1)
  })
  it('нет записей с подходами → null; дата последней тренировки', () => {
    expect(draftFromLast([], new Set(['a']), 'd', new Date(), () => 'x')).toBeNull()
    expect(draftFromLast([en('1', 'a', '2026-10-20', 0)], new Set(['a']), 'd', new Date(), () => 'x')).toBeNull()
    expect(lastWorkoutDate([en('1', 'a', '2026-10-20', 1), en('2', 'a', '2026-10-22', 0)])).toBe('2026-10-20')
  })
})

import { normalizeSupersets, supersetPos, toggleSupersetWithNext } from './activeWorkout'
describe('суперсеты', () => {
  const four = () => ['a', 'b', 'c', 'd'].reduce((d, id) => addExercise(d, id, 'x' + id), newDraft('s', new Date(2026, 10, 1)))
  const groups = (d: ReturnType<typeof four>) => d.exercises.map((e) => e.superset_group)
  it('объединить со следующим; ещё раз со следующим достраивает группу; на последнем — ничего', () => {
    let d = toggleSupersetWithNext(four(), 'a'); expect(groups(d)).toEqual([1, 1, null, null])
    d = toggleSupersetWithNext(d, 'b'); expect(groups(d)).toEqual([1, 1, 1, null]); expect(supersetPos(d, 0)).toBe('start'); expect(supersetPos(d, 1)).toBe('mid'); expect(supersetPos(d, 2)).toBe('end'); expect(supersetPos(d, 3)).toBe('none')
    expect(toggleSupersetWithNext(d, 'd')).toBe(d)
  })
  it('соединяет две группы в одну; разъединить рвёт после выбранного, одиночки сбрасываются', () => {
    let d = toggleSupersetWithNext(toggleSupersetWithNext(four(), 'a'), 'c'); expect(groups(d)).toEqual([1, 1, 2, 2])
    d = toggleSupersetWithNext(d, 'b'); expect(groups(d)).toEqual([1, 1, 1, 1])
    d = toggleSupersetWithNext(d, 'b'); expect(groups(d)).toEqual([1, 1, 2, 2]) // разрыв между b и c: обе половины — пары
    d = toggleSupersetWithNext(d, 'a'); expect(groups(d)).toEqual([null, null, 1, 1]) // номера пересчитаны; разъединили пару — остались одиночки, сброшены
  })
  it('перемещение и удаление не оставляют разорванных и одиночных групп', () => {
    let d = toggleSupersetWithNext(toggleSupersetWithNext(four(), 'a'), 'b') // a,b,c в группе 1
    expect(groups(removeExercise(d, 'b'))).toEqual([1, 1, null]) // a,c остались подряд
    expect(groups(removeExercise(removeExercise(d, 'b'), 'c'))).toEqual([null, null])
    expect(groups(moveExercise(d, 'a', 1))).toEqual([1, 1, 1, null]) // перестановка внутри группы
    expect(groups(moveExercise(d, 'c', 1))).toEqual([1, 1, null, null]) // c ушла из группы за её пределы
    expect(normalizeSupersets(d)).toBe(d)
  })
})

describe('прошлое: источник «лучший»', () => {
  const st = (w: number, r: number) => ({ reps: r, weight: w, time: null, duration: null, side: null })
  const entries = [
    { exercise_id: 'x', date: '2026-10-01', sets: [st(100, 3), st(100, 2)] },
    { exercise_id: 'x', date: '2026-10-20', sets: [st(60, 8)] },
    { exercise_id: 'x', date: '2026-10-25', sets: [{ ...st(120, 1), type: 'warmup' as const }, st(70, 5)] },
  ]
  it('«прошлый раз» — последняя тренировка, «лучший» — с самым тяжёлым рабочим подходом (разминка не считается)', () => {
    expect(previousSet(entries, 'x', '2026-11-01', 0, 'last')).toMatchObject({ weight: 70 })
    expect(previousSet(entries, 'x', '2026-11-01', 0, 'best')).toMatchObject({ weight: 100, reps: 3 })
    expect(previousSet(entries, 'x', '2026-11-01', 1, 'best')).toMatchObject({ weight: 100, reps: 2 })
  })
  it('при равном весе лучшей считается более свежая; без истории — null', () => {
    const e = [{ exercise_id: 'x', date: '2026-10-01', sets: [st(80, 5)] }, { exercise_id: 'x', date: '2026-10-10', sets: [st(80, 6)] }]
    expect(previousSet(e, 'x', '2026-11-01', 0, 'best')).toMatchObject({ reps: 6 })
    expect(previousSet([], 'x', '2026-11-01', 0, 'best')).toBeNull()
  })
})

describe('заметка к упражнению', () => {
  it('setExerciseNote: ставит, обрезает до 500, пустая — null, чужие не трогает', () => {
    let d = addExercise(addExercise(newDraft('d', new Date()), 'a', 'e1'), 'b', 'e2')
    d = setExerciseNote(d, 'a', 'хват уже')
    expect(d.exercises.map((e) => e.note)).toEqual(['хват уже', null])
    expect(setExerciseNote(d, 'a', 'x'.repeat(900)).exercises[0].note).toHaveLength(500)
    expect(setExerciseNote(d, 'a', '').exercises[0].note).toBeNull()
  })
  it('заметка попадает в запись при сохранении', () => {
    let d = addExercise(newDraft('d', new Date()), 'a', 'e1')
    d = toggleDone(updateSet(d, 'a', 0, { reps: 5, weight: 50 }), 'a', 0)
    expect(finishDraft(setExerciseNote(d, 'a', ' низкий упор '), new Date().toISOString(), false).entries[0].notes).toBe('низкий упор')
  })
  it('lastNote: самая свежая до даты, пустые игнорируются', () => {
    const e = [{ exercise_id: 'x', date: '2026-01-01', notes: 'старая' }, { exercise_id: 'x', date: '2026-02-01', notes: ' новая ' }, { exercise_id: 'x', date: '2026-03-01', notes: '  ' }, { exercise_id: 'y', date: '2026-02-15', notes: 'чужая' }]
    expect(lastNote(e, 'x', '2026-04-01')).toBe('новая')
    expect(lastNote(e, 'x', '2026-02-01')).toBe('старая')
    expect(lastNote(e, 'z', '2026-04-01')).toBeNull()
  })
})

describe('шаг поля клавишами ↑/↓', () => {
  it('stepNumber: пусто + ↑ = шаг, без хвостов дробей, ниже нуля не уходит', () => {
    expect(stepNumber(null, 1, 2.5)).toBe(2.5)
    expect(stepNumber(60, 1, 2.5)).toBe(62.5)
    expect(stepNumber(62.5, -1, 2.5)).toBe(60)
    expect(stepNumber(0.1, 1, 0.2)).toBe(0.3)
    expect(stepNumber(1, -1, 2.5)).toBe(0)
    expect(stepNumber(undefined, -1, 1)).toBe(0)
  })
  it('шаг веса: 2,5 для кг, 5 для lb', () => { expect(weightStep('kg')).toBe(2.5); expect(weightStep('lb')).toBe(5) })
})

describe('суперсет: ввод попеременно', () => {
  // A, B — суперсет; C — отдельно. По 2 подхода
  const mk = () => {
    let d = newDraft('d', new Date())
    for (const [id, ex] of [['a', 'e1'], ['b', 'e2'], ['c', 'e3']] as const) { d = addExercise(d, id, ex); d = addSet(d, id) }
    return toggleSupersetWithNext(d, 'a')
  }
  it('A1 → B1 → A2 → B2 → конец раунда', () => {
    const d = mk()
    expect(nextSupersetTarget(d, 0, 0)).toEqual({ ei: 1, i: 0 })
    const d2 = toggleDone(d, 'a', 0), d3 = toggleDone(d2, 'b', 0)
    expect(nextSupersetTarget(d3, 1, 0)).toEqual({ ei: 0, i: 1 })
    const d4 = toggleDone(d3, 'a', 1)
    expect(nextSupersetTarget(d4, 0, 1)).toEqual({ ei: 1, i: 1 })
    expect(nextSupersetTarget(toggleDone(d4, 'b', 1), 1, 1)).toBeNull()
  })
  it('не суперсет — null; у соседа нет такого подхода — берём следующий по кругу, иначе null', () => {
    const d = mk()
    expect(nextSupersetTarget(d, 2, 0)).toBeNull()
    const short = removeSet(removeSet(d, 'b', 1), 'b', 0) // у B подходов нет
    expect(nextSupersetTarget(short, 0, 0)).toEqual({ ei: 0, i: 1 })
  })
})

