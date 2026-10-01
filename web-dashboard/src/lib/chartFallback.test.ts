import { describe, expect, it } from 'vitest'
import { filterPointsByRange, filterPointsWithFallback, periodBounds } from './chart'

const TODAY = new Date(2026, 9, 1) // 2026-10-01 (четверг)
const pts = (rows: [string, number | null][]) => rows.map(([date, y]) => ({ date, y }))

describe('filterPointsWithFallback (BACKLOG 18.2)', () => {
  // сценарий владельца: последняя запись сегодня, предыдущая — 20 дней назад, период «10 дней»
  const series = pts([['2026-09-05', 88], ['2026-09-10', 89], ['2026-09-11', 89.5], ['2026-10-01', 90]])

  it('is the same as the plain filter when the period already has two values', () => {
    const s = pts([['2026-09-25', 1], ['2026-09-30', 2], ['2026-10-01', 3]])
    expect(filterPointsWithFallback(s, 'days10', null, null, TODAY)).toEqual({ points: filterPointsByRange(s, 'days10', null, null, TODAY), widened: false })
  })

  it('widens a 10-day window with a single value to the last two entries and says so', () => {
    expect(filterPointsByRange(series, 'days10', null, null, TODAY)).toHaveLength(1) // тот самый «Последнее значение: 90»
    const r = filterPointsWithFallback(series, 'days10', null, null, TODAY)
    expect(r.widened).toBe(true)
    expect(r.points.map((p) => p.date)).toEqual(['2026-09-11', '2026-10-01'])
  })

  it('"all" is never widened or changed', () => {
    expect(filterPointsWithFallback(series, 'all', null, null, TODAY)).toEqual({ points: series, widened: false })
  })

  it('stays as it was when the whole series has fewer than two values', () => {
    const one = pts([['2026-10-01', 90]])
    expect(filterPointsWithFallback(one, 'days10', null, null, TODAY)).toEqual({ points: one, widened: false })
    expect(filterPointsWithFallback([], 'days10', null, null, TODAY)).toEqual({ points: [], widened: false })
  })

  it('"this week" on a Monday is widened instead of showing one lonely point', () => {
    const monday = new Date(2026, 9, 5) // 2026-10-05, понедельник
    const s = pts([['2026-10-01', 80], ['2026-10-03', 81], ['2026-10-05', 82]])
    const r = filterPointsWithFallback(s, 'week', null, null, monday)
    expect(r.widened).toBe(true)
    expect(r.points.map((p) => p.date)).toEqual(['2026-10-03', '2026-10-05'])
  })

  it('a closed custom/last-week period is not stretched past its end date', () => {
    const s = pts([['2026-09-10', 1], ['2026-09-12', 2], ['2026-09-25', 3]])
    const r = filterPointsWithFallback(s, 'custom', '2026-09-20', '2026-09-30', TODAY)
    expect(r.widened).toBe(true)
    expect(r.points.map((p) => p.date)).toEqual(['2026-09-12', '2026-09-25'])
    // до конца периода значений меньше двух — расширять нечем
    const r2 = filterPointsWithFallback(s, 'custom', '2026-09-01', '2026-09-11', TODAY)
    expect(r2.widened).toBe(false)
  })

  it('null (missing) days do not count as values', () => {
    const s = pts([['2026-09-01', 5], ['2026-09-02', 6], ['2026-09-28', null], ['2026-09-30', 7], ['2026-10-01', null]])
    const r = filterPointsWithFallback(s, 'days10', null, null, TODAY)
    expect(r.widened).toBe(true)
    expect(r.points.map((p) => p.date)).toEqual(['2026-09-02', '2026-09-28', '2026-09-30', '2026-10-01'])
  })
})

describe('last 30 days period (new default for charts, BACKLOG 18.2)', () => {
  it('covers exactly 30 calendar days including today', () => {
    expect(periodBounds('days30', null, null, TODAY)).toEqual(['2026-09-02', '2026-10-01'])
  })
  it('shows an entry from 20 days ago without any fallback, unlike the 10-day window', () => {
    const series = pts([['2026-09-11', 89.5], ['2026-10-01', 90]])
    const r = filterPointsWithFallback(series, 'days30', null, null, TODAY)
    expect(r).toEqual({ points: series, widened: false })
  })
})
