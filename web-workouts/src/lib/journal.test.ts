import { describe, expect, it } from 'vitest'
import { countSets, journalDays, todayItems } from './journal'
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
