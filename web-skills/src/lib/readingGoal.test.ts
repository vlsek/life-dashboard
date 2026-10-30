import { beforeEach, describe, expect, it } from 'vitest'
import { booksWord, clampGoal, loadGoal, perMonthCounts, readingStats, saveGoal } from './readingGoal'

const done = (d: string) => ({ status: 'done', done_date: d })
const NOW = new Date(2026, 6, 2) // 2 июля 2026: 183-й день из 365

beforeEach(() => localStorage.clear())

describe('perMonthCounts', () => {
  it('считает только прочитанные книги выбранного года по месяцам, чужие годы, «хочу прочитать» и книги без даты — нет', () => {
    const r = perMonthCounts([done('2026-01-05'), done('2026-01-30'), done('2026-12-31'), done('2025-06-01'), { status: 'to_read', done_date: '2026-03-03' }, { status: 'done', done_date: null }, done('кривая')], 2026)
    expect(r).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
  })
})

describe('readingStats', () => {
  const books = [done('2026-01-10'), done('2026-02-10'), done('2026-03-10'), done('2026-04-10'), done('2026-05-10'), done('2026-06-10')]
  it('без цели: состояние «нет цели», кольцо 0, но число прочитанного считается', () => {
    const s = readingStats(books, 0, NOW)
    expect(s).toMatchObject({ state: 'noGoal', pct: 0, done: 6, goal: 0 })
  })
  it('опережает: 6 из 12 к середине года — «положено» ≈ 6.0, это ровно; из 8 — отстаёт', () => {
    expect(readingStats(books, 12, NOW).state).toBe('even')
    const behind = readingStats(books, 20, NOW)
    expect(behind.state).toBe('behind')
    expect(behind.gap).toBe(4) // 20 × 183/365 ≈ 10.03, прочитано 6
    expect(readingStats(books, 8, NOW).state).toBe('ahead')
    expect(readingStats(books, 8, NOW).gap).toBe(2) // «положено» ≈ 4.01
  })
  it('цель выполнена или перевыполнена: состояние done, кольцо не больше 100', () => {
    const s = readingStats(books, 5, NOW)
    expect(s.state).toBe('done')
    expect(s.pct).toBe(100)
  })
  it('кольцо — доля от цели, округлённая', () => {
    expect(readingStats(books, 24, NOW).pct).toBe(25)
  })
  it('средний темп — книг в месяц с учётом прошедшей части года; в январе не делится на ~0', () => {
    expect(readingStats(books, 12, NOW).avgPerMonth).toBe(1)
    expect(readingStats([done('2026-01-01')], 12, new Date(2026, 0, 1)).avgPerMonth).toBe(2) // 1 книга / 0.5 мин. месяца
  })
  it('високосный год: 31 декабря — доля 1', () => {
    const s = readingStats([], 10, new Date(2028, 11, 31))
    expect(s.expected).toBeCloseTo(10, 5)
  })
})

describe('цель в localStorage', () => {
  it('сохраняется по году, ноль/мусор удаляют, верхняя граница 999', () => {
    expect(saveGoal(2026, 24)).toBe(24)
    expect(loadGoal(2026)).toBe(24)
    expect(loadGoal(2027)).toBe(0)
    expect(saveGoal(2026, 5000)).toBe(999)
    expect(saveGoal(2026, 0)).toBe(0)
    expect(localStorage.getItem('reading_goal_2026')).toBeNull()
    expect(clampGoal('abc')).toBe(0)
    expect(clampGoal(-3)).toBe(0)
    expect(clampGoal(12.9)).toBe(12)
  })
})

describe('booksWord', () => {
  it('русские формы: 1 книга, 2–4 книги, 5–20 книг, 21 книга, 11 книг', () => {
    expect([1, 2, 5, 11, 12, 21, 22, 25, 100, 101].map((n) => booksWord(n, 'ru'))).toEqual(['книга', 'книги', 'книг', 'книг', 'книг', 'книга', 'книги', 'книг', 'книг', 'книга'])
  })
  it('английские формы', () => {
    expect(booksWord(1, 'en')).toBe('book')
    expect(booksWord(2, 'en')).toBe('books')
  })
})
