import { describe, expect, it } from 'vitest'
import { trainedDays, weekStreak } from './weekStreak'
import type { WorkoutEntry } from './types'

// 2026-10-14 — среда; неделя пн 2026-10-12, прошлая 10-05, позапрошлая 09-28, дальше 09-21, 09-14
const today = '2026-10-14'
const en = (date: string, sets = 1): WorkoutEntry => ({ id: date + sets, user_id: 'u', exercise_id: 'e', date, sets: Array.from({ length: sets }, () => ({ reps: 10, weight: null, time: null, duration: null, side: null })), notes: null })

describe('trainedDays', () => {
  it('день с записью без подходов не считается', () => {
    expect([...trainedDays([en('2026-10-01', 0), en('2026-10-02')])]).toEqual(['2026-10-02'])
  })
})

describe('weekStreak', () => {
  it('нет записей — нули и 8 пустых столбиков', () => {
    const r = weekStreak([], today)
    expect(r).toMatchObject({ current: 0, best: 0, thisWeekDays: 0 })
    expect(r.bars).toHaveLength(8)
    expect(r.bars.at(-1)!.monday).toBe('2026-10-12')
  })
  it('серия: текущая неделя + две прошлые подряд = 3; дни недели считаются разные', () => {
    const r = weekStreak([en('2026-10-13'), en('2026-10-14'), en('2026-10-06'), en('2026-09-30')], today)
    expect(r.current).toBe(3)
    expect(r.thisWeekDays).toBe(2)
    expect(r.bars.at(-1)!.days).toBe(2)
  })
  it('пустая текущая неделя серию не рвёт — считаем до прошлой', () => {
    const r = weekStreak([en('2026-10-06'), en('2026-09-30')], today)
    expect(r.current).toBe(2)
    expect(r.thisWeekDays).toBe(0)
  })
  it('пропущена целая прошлая неделя — серия 0 (текущая пуста), лучшая запоминается', () => {
    const r = weekStreak([en('2026-09-30'), en('2026-09-22'), en('2026-09-15'), en('2026-09-09')], today)
    expect(r.current).toBe(0)
    expect(r.best).toBe(4) // недели с 09-07 по 09-28 подряд
  })
  it('есть тренировка на текущей неделе, но прошлая пропущена — серия 1, лучшая из старых', () => {
    const r = weekStreak([en('2026-10-13'), en('2026-09-22'), en('2026-09-15'), en('2026-09-08')], today)
    expect(r.current).toBe(1)
    expect(r.best).toBe(3)
  })
  it('граница недель: воскресенье и понедельник — разные недели', () => {
    const r = weekStreak([en('2026-10-11'), en('2026-10-12')], today) // вс прошлой недели и пн текущей
    expect(r.current).toBe(2)
  })
})
