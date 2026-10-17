import { describe, expect, it } from 'vitest'
import { appendEntrySet, mirrorSets, newEntrySet, parseQuickReps } from './lib/linkedSets'

// BACKLOG 44.5а / 62.1: чистые правила быстрого ввода у метрики, связанной с упражнением «Тренировок» (запись подхода — в linkedSetsColumn.test.ts, число — в linkedNumberQuickAdd.test.ts).
describe('linkedSets: чистые правила', () => {
  it('повторы: только положительное число, запятая допустима', () => {
    expect(parseQuickReps('12')).toBe(12)
    expect(parseQuickReps('7,5')).toBe(7.5)
    for (const bad of ['', '0', '-3', 'abc']) expect(parseQuickReps(bad)).toBeNull()
  })
  it('подход записи тренировки: только повторы и время, остальное пусто', () => {
    expect(newEntrySet(10, new Date(2026, 9, 9, 7, 5))).toEqual({ reps: 10, weight: null, time: '07:05', duration: null, side: null })
  })
  it('дописывание в запись: битые sets не ломают', () => {
    const s = newEntrySet(5)
    expect(appendEntrySet([{ reps: 1 }], s)).toHaveLength(2)
    expect(appendEntrySet(null, s)).toEqual([s])
    expect(appendEntrySet('x', s)).toEqual([s])
  })
  it('зеркало: все записи дня по времени, без времени — после, в порядке записи', () => {
    const rows = mirrorSets([
      { sets: [{ reps: 5, time: null }, { reps: 8, time: '09:00' }] },
      { sets: [{ reps: 3, time: '08:00' }, { reps: 4, time: null }] },
      { sets: null },
    ])
    expect(rows.map((r) => r.reps)).toEqual([3, 8, 5, 4])
    expect(rows.every((r) => r.variation === null)).toBe(true)
  })
})
