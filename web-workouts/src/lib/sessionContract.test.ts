import { describe, expect, it } from 'vitest'
import { groupSessions, isDone, isWorking, normalizeRpe, readSettings, sessionMinutes, setType, setsVolume, supersetGroups, workingSetCount } from './sessionContract'
import type { SetV2, WorkoutSession } from './sessionContract'
import type { WorkoutEntry } from './types'

const st = (reps: number, weight: number | null, x: Partial<SetV2> = {}): SetV2 => ({ reps, weight, time: null, duration: null, side: null, ...x })
const en = (id: string, date: string, x: object = {}): WorkoutEntry => ({ id, user_id: 'u', exercise_id: 'e' + id, date, sets: [], notes: null, ...x })
const se = (id: string, date: string, start: string, fin: string | null = null): WorkoutSession => ({ id, user_id: 'u', name: null, date, started_at: start, finished_at: fin, routine_id: null, notes: null, source: 'live' })

describe('подходы v2', () => {
  it('неизвестный тип = обычный; старые записи без полей валидны', () => {
    expect(setType({})).toBe('normal'); expect(setType({ type: 'wat' })).toBe('normal'); expect(setType({ type: 'drop' })).toBe('drop')
    expect(isDone({})).toBe(true); expect(isDone({ done: false })).toBe(false)
  })
  it('разминка и невыполненные подходы не входят в объём и счёт', () => {
    const sets = [st(10, 100, { type: 'warmup' }), st(5, 100), st(5, 100, { done: false }), st(3, 50, { type: 'failure' })]
    expect(setsVolume(sets)).toBe(5 * 100 + 3 * 50); expect(workingSetCount(sets)).toBe(2)
    expect(isWorking({ type: 'warmup' })).toBe(false)
  })
  it('RPE: шаг 0.5 в 5…10, иначе null', () => {
    expect(normalizeRpe(8.7)).toBe(8.5); expect(normalizeRpe(4)).toBeNull(); expect(normalizeRpe(11)).toBeNull(); expect(normalizeRpe('8')).toBeNull()
  })
})

describe('тренировки из записей', () => {
  it('записи без сессии — «неявная тренировка» за день; с сессией — в сессии; неизвестная сессия — как без неё', () => {
    const sessions = [se('s1', '2026-10-28', '2026-10-28T10:00:00Z', '2026-10-28T11:00:00Z')]
    const v = groupSessions([en('a', '2026-10-28', { session_id: 's1', position: 1 }), en('b', '2026-10-28', { session_id: 's1', position: 0 }), en('c', '2026-10-27'), en('d', '2026-10-27', { session_id: 'gone' })], sessions)
    expect(v.map(x => x.key)).toEqual(['s1', 'implicit:2026-10-27'])
    expect(v[0].entries.map(e => e.id)).toEqual(['b', 'a']); expect(v[1].entries.map(e => e.id)).toEqual(['c', 'd']); expect(v[1].session).toBeNull()
  })
  it('пустая идущая сессия видна; новые сверху', () => {
    const v = groupSessions([en('x', '2026-10-20')], [se('live', '2026-10-29', '2026-10-29T09:00:00Z')])
    expect(v.map(x => x.key)).toEqual(['live', 'implicit:2026-10-20'])
  })
  it('длительность: идущая — до «сейчас», неявная — null', () => {
    const now = Date.parse('2026-10-29T10:30:00Z')
    expect(sessionMinutes(se('s', 'd', '2026-10-29T09:00:00Z'), now)).toBe(90)
    expect(sessionMinutes(se('s', 'd', '2026-10-29T09:00:00Z', '2026-10-29T09:45:00Z'), now)).toBe(45)
    expect(sessionMinutes(null, now)).toBeNull()
  })
  it('суперсет: одиночная группа не считается', () => {
    const g = supersetGroups([en('a', 'd', { superset_group: 1 }), en('b', 'd', { superset_group: 1 }), en('c', 'd', { superset_group: 2 }), en('d', 'd')])
    expect([...g.keys()]).toEqual([1]); expect(g.get(1)).toEqual(['a', 'b'])
  })
})

describe('настройки', () => {
  it('мусор заменяется значениями по умолчанию', () => {
    expect(readSettings(null).units).toBe('kg'); expect(readSettings({ units: 'lb', rest_default: 120, rpe: true }).rest_default).toBe(120)
    expect(readSettings({ rest_default: -5, auto_rest: 'да' }).rest_default).toBe(90); expect(readSettings({ auto_rest: 'да' }).auto_rest).toBe(true)
  })
})
