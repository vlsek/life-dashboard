import { describe, expect, it } from 'vitest'
import { growthRows, setScore } from './growth'
import type { Exercise, WorkoutEntry } from './types'

const today = '2026-10-13' // последние 28 дней: 2026-09-16…10-13, предыдущие: 2026-08-19…09-15
const ex = (id: string, o: Partial<Exercise> = {}): Exercise => ({ id, user_id: 'u', name: id, category: null, tracks_weight: false, value_label: null, unit: null, suggested_scheme: null, created_at: '2026-01-01', ...o })
const en = (exercise_id: string, date: string, reps: number, weight: number | null = null): WorkoutEntry => ({ id: exercise_id + date, user_id: 'u', exercise_id, date, sets: [{ reps, weight, time: null, duration: null, side: null }], notes: null })
const rows = (entries: WorkoutEntry[], exercises: Exercise[]) => growthRows(entries, exercises, today, 'kg')

describe('setScore', () => {
  it('вес × (1 + повторы/30); без веса — повторы; пусто — null', () => {
    expect(setScore(ex('a', { tracks_weight: true }), 10, 60)).toBeCloseTo(80)
    expect(setScore(ex('a'), 12, null)).toBe(12)
    expect(setScore(ex('a', { tracks_weight: true }), 8, null)).toBe(8)
    expect(setScore(ex('a'), null, null)).toBeNull()
    expect(setScore(ex('a'), 0, null)).toBeNull()
  })
})

describe('growthRows', () => {
  it('растёт / стоит / просело по порогу ±3 %, «было → стало» из лучших подходов окон', () => {
    const e = [ex('up'), ex('flat'), ex('down')]
    const r = rows([en('up', '2026-08-25', 10), en('up', '2026-10-01', 12), en('flat', '2026-08-25', 10), en('flat', '2026-10-01', 10), en('down', '2026-08-25', 10), en('down', '2026-10-01', 8)], e)
    expect(r.map((x) => [x.exerciseId, x.status, x.deltaPct])).toEqual([['up', 'up', 20], ['flat', 'flat', 0], ['down', 'down', -20]])
    expect(r[0].prevText).toBe('10')
    expect(r[0].curText).toBe('12')
  })
  it('упражнение с весом сравнивается по оценке максимума', () => {
    const r = rows([en('b', '2026-08-25', 10, 60), en('b', '2026-10-01', 10, 66)], [ex('b', { tracks_weight: true })])
    expect(r[0]).toMatchObject({ status: 'up', deltaPct: 10 })
    expect(r[0].prevText).toBe('10×60kg')
  })
  it('нет записей в прошлом окне — «новое»; нет в последнем окне — не показываем', () => {
    const r = rows([en('n', '2026-10-05', 9), en('old', '2026-08-25', 9)], [ex('n'), ex('old')])
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ exerciseId: 'n', status: 'new', deltaPct: null, prevText: null, curText: '9' })
  })
  it('границы окон: 16.09 — ещё последнее окно, 15.09 — уже прошлое', () => {
    const r = rows([en('x', '2026-09-15', 10), en('x', '2026-09-16', 12)], [ex('x')])
    expect(r[0]).toMatchObject({ status: 'up', deltaPct: 20 })
  })
  it('порядок: растущие (сильнее — выше), стоящие, просевшие, новые', () => {
    const e = [ex('d'), ex('n'), ex('u1'), ex('u2'), ex('f')]
    const r = rows([en('d', '2026-08-25', 10), en('d', '2026-10-01', 5), en('n', '2026-10-01', 5), en('u1', '2026-08-25', 10), en('u1', '2026-10-01', 11), en('u2', '2026-08-25', 10), en('u2', '2026-10-01', 15), en('f', '2026-08-25', 10), en('f', '2026-10-01', 10)], e)
    expect(r.map((x) => x.exerciseId)).toEqual(['u2', 'u1', 'f', 'd', 'n'])
  })
})
