import { describe, expect, it } from 'vitest'
import { bestSet, countSets, entryRecord, journalDays, todayItems } from './journal'
import type { Exercise, WorkoutEntry } from './types'

const ex = (id: string): Exercise => ({ id, name: id, category: 'upper', tracks_weight: true } as unknown as Exercise)
const en = (id: string, exercise_id: string, date: string, times: (string | null)[]): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id, date, notes: null, sets: times.map((time) => ({ reps: 5, weight: 10, time })) }) as unknown as WorkoutEntry

const exs = [ex('a'), ex('b')]

describe('journal', () => {
  it('сегодня: только записи дня, по времени первого подхода, удалённые упражнения пропущены', () => {
    const entries = [en('1', 'b', '2026-10-15', ['10:00']), en('2', 'a', '2026-10-15', ['09:00']), en('3', 'a', '2026-10-14', ['08:00']), en('4', 'gone', '2026-10-15', ['07:00'])]
    const items = todayItems(entries, exs, '2026-10-15')
    expect(items.map((i) => i.entry.id)).toEqual(['2', '1'])
  })
  it('подсчёт подходов', () => {
    const items = todayItems([en('1', 'a', 'd', ['1', '2', '3']), en('2', 'b', 'd', [null, null])], exs, 'd')
    expect(countSets(items)).toBe(5)
  })
  it('журнал: дни свежие сверху, лимит, пустые дни не попадают', () => {
    const entries = [en('1', 'a', '2026-10-10', ['1']), en('2', 'a', '2026-10-12', ['1', '2']), en('3', 'gone', '2026-10-14', ['1']), en('4', 'b', '2026-10-11', ['1'])]
    const days = journalDays(entries, exs)
    expect(days.map((d) => d.date)).toEqual(['2026-10-12', '2026-10-11', '2026-10-10'])
    expect(days[0].setCount).toBe(2)
    expect(journalDays(entries, exs, 2)).toHaveLength(2)
  })
})

const withSets = (id: string, exercise_id: string, date: string, sets: Record<string, unknown>[]): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id, date, notes: null, sets: sets.map((s) => ({ reps: null, weight: null, time: null, duration: null, side: null, ...s })) }) as unknown as WorkoutEntry

describe('лента истории: лучший подход и рекорд (69.11 срез 1)', () => {
  it('лучший подход — по оценке 1ПМ, разминка и невыполненные не считаются', () => {
    const b = bestSet([{ reps: 10, weight: 40 }, { reps: 5, weight: 60 }, { reps: 20, weight: 100, type: 'warmup' }, { reps: 1, weight: 200, done: false }] as never)
    expect(b).toMatchObject({ reps: 5, weight: 60 })
    expect(bestSet([{ reps: 12, weight: null }, { reps: 15, weight: null }] as never)).toMatchObject({ reps: 15 })
    expect(bestSet([{ duration: 30 }, { duration: 45 }] as never)).toMatchObject({ duration: 45 })
    expect(bestSet([])).toBeNull()
  })
  it('рекорд — против записей ДО этого дня; первая запись упражнения рекордом не считается', () => {
    const first = withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }])
    const second = withSets('2', 'a', '2026-10-08', [{ reps: 5, weight: 55 }])
    const third = withSets('3', 'a', '2026-10-15', [{ reps: 5, weight: 55 }])
    const all = [first, second, third]
    expect(entryRecord(first, all)).toBeNull()
    expect(entryRecord(second, all)).toBe('weight')
    expect(entryRecord(third, all)).toBeNull()
  })
  it('рекорд не берётся от более поздних записей и от других упражнений', () => {
    const early = withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }])
    const late = withSets('2', 'a', '2026-10-20', [{ reps: 5, weight: 100 }])
    const other = withSets('3', 'b', '2026-09-01', [{ reps: 5, weight: 500 }])
    expect(entryRecord(early, [early, late, other])).toBeNull()
    expect(entryRecord(late, [early, late, other])).toBe('weight')
  })
  it('journalDays проставляет best и record в элементы', () => {
    const e1 = withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }])
    const e2 = withSets('2', 'a', '2026-10-08', [{ reps: 6, weight: 50 }, { reps: 5, weight: 60 }])
    const days = journalDays([e1, e2], exs)
    expect(days[0].items[0].best).toMatchObject({ reps: 5, weight: 60 })
    expect(days[0].items[0].record).toBe('weight')
    expect(days[1].items[0].record).toBeNull()
  })
})
