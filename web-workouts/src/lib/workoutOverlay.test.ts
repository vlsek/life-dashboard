import { describe, expect, it } from 'vitest'
import { applyPendingWorkouts, type PendingOp } from './workoutOverlay'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 66.5в: ожидающие записи накладываются на загруженные данные — без сети новые подходы и упражнения видны сразу.
const ex = (id: string, name = 'Отжимания'): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: false, value_label: null, unit: null, suggested_scheme: null, created_at: '2026-10-01T00:00:00Z' })
const en = (id: string, exId: string, date: string): WorkoutEntry => ({ id, user_id: 'u', exercise_id: exId, date, sets: [{ reps: 10 } as never], notes: null })
let seq = 0
const op = (table: string, o: PendingOp['op'], extra: Partial<PendingOp>): PendingOp => ({ seq: ++seq, table, op: o, clientTs: 1_700_000_000_000, status: 'pending', ...extra })

describe('applyPendingWorkouts', () => {
  it('нет ожидающих — те же данные (те же ссылки)', () => {
    const E = [ex('e1')], N = [en('n1', 'e1', '2026-10-02')]
    const r = applyPendingWorkouts(E, N, [])
    expect(r.exercises).toBe(E)
    expect(r.entries).toBe(N)
  })
  it('вставка записи: появляется, идемпотентна (повторное наложение или уже пришедшая с сервера — без дубля), порядок по дате', () => {
    const N = [en('n1', 'e1', '2026-10-05')]
    const ins = op('workout_entries', 'insert', { payload: { id: 'n2', user_id: 'u', exercise_id: 'e1', date: '2026-10-03', sets: [{ reps: 7 }], notes: 'х' } })
    const r1 = applyPendingWorkouts([ex('e1')], N, [ins])
    expect(r1.entries.map((e) => e.id)).toEqual(['n2', 'n1'])
    expect(r1.entries[0].notes).toBe('х')
    const r2 = applyPendingWorkouts(r1.exercises, r1.entries, [ins])
    expect(r2.entries).toHaveLength(2)
    const served = applyPendingWorkouts([ex('e1')], [...N, en('n2', 'e1', '2026-10-03')], [ins])
    expect(served.entries).toHaveLength(2)
  })
  it('вставка → правка → удаление одной записи применяются по порядку постановки', () => {
    const base = [en('n1', 'e1', '2026-10-05')]
    const edit = op('workout_entries', 'update', { match: { id: 'n1' }, payload: { sets: [{ reps: 99 }], date: '2026-10-06' } })
    const r = applyPendingWorkouts([ex('e1')], base, [edit])
    expect(r.entries[0].date).toBe('2026-10-06')
    expect((r.entries[0].sets[0] as { reps: number }).reps).toBe(99)
    const del = op('workout_entries', 'delete', { match: { id: 'n1' } })
    expect(applyPendingWorkouts([ex('e1')], base, [edit, del]).entries).toEqual([])
    // порядок задаёт seq, а не позиция в массиве
    const late = op('workout_entries', 'update', { match: { id: 'n1' }, payload: { notes: 'поздно' } })
    const early = { ...op('workout_entries', 'update', { match: { id: 'n1' }, payload: { notes: 'рано' } }), seq: late.seq - 5 }
    expect(applyPendingWorkouts([ex('e1')], base, [late, early]).entries[0].notes).toBe('поздно')
  })
  it('упражнение: вставка (значения по умолчанию, created_at из времени постановки), правка, удаление вместе с его записями', () => {
    const ins = op('workout_exercises', 'insert', { payload: { id: 'e2', user_id: 'u', name: 'Подтягивания', tracks_weight: true } })
    const r = applyPendingWorkouts([ex('e1')], [en('n1', 'e1', '2026-10-02'), en('n2', 'e2', '2026-10-02')], [ins])
    const e2 = r.exercises.find((e) => e.id === 'e2')!
    expect(e2).toMatchObject({ name: 'Подтягивания', tracks_weight: true, category: null, unit: null })
    expect(e2.created_at).toBe(new Date(1_700_000_000_000).toISOString())
    const upd = op('workout_exercises', 'update', { match: { id: 'e1' }, payload: { name: 'Отжимания (узкие)' } })
    expect(applyPendingWorkouts([ex('e1')], [], [upd]).exercises[0].name).toBe('Отжимания (узкие)')
    const del = op('workout_exercises', 'delete', { match: { id: 'e1' } })
    const d = applyPendingWorkouts([ex('e1'), ex('e2')], [en('n1', 'e1', '2026-10-02'), en('n2', 'e2', '2026-10-02')], [del])
    expect(d.exercises.map((e) => e.id)).toEqual(['e2'])
    expect(d.entries.map((e) => e.id)).toEqual(['n2'])
  })
  it('«проблемные» (failed) и чужие таблицы не показываются', () => {
    const failed = op('workout_entries', 'insert', { status: 'failed', payload: { id: 'nx', exercise_id: 'e1', date: '2026-10-09' } })
    const other = op('daily_values', 'upsert', { payload: { id: 'zz' } })
    expect(applyPendingWorkouts([ex('e1')], [], [failed, other]).entries).toEqual([])
  })
})
