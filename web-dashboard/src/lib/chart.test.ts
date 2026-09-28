import { describe, it, expect } from 'vitest'
import { prepareChartSeries, periodBounds, filterPointsByRange } from './chart'

describe('prepareChartSeries', () => {
  it('returns empty for no points', () => {
    expect(prepareChartSeries([])).toEqual([])
  })

  it('returns the single point as-is', () => {
    expect(prepareChartSeries([{ date: '2026-06-01', y: 5 }])).toEqual([{ date: '2026-06-01', y: 5 }])
  })

  it('fills gaps between the first and last date with null', () => {
    const out = prepareChartSeries([
      { date: '2026-06-01', y: 1 },
      { date: '2026-06-03', y: 3 },
    ])
    expect(out).toEqual([
      { date: '2026-06-01', y: 1 },
      { date: '2026-06-02', y: null },
      { date: '2026-06-03', y: 3 },
    ])
  })

  it('buckets into groups of last-known-value when more than maxPoints days', () => {
    // 6 дней, maxPoints=3 -> bucketSize = ceil(6/3) = 2
    const points = [0, 1, 2, 3, 4, 5].map((i) => ({ date: `2026-06-0${i + 1}`, y: i }))
    const out = prepareChartSeries(points, 3)
    expect(out).toHaveLength(3)
    expect(out.map((p) => p.y)).toEqual([1, 3, 5]) // последнее известное значение в каждой паре дней
    expect(out.every((p) => p.bucketDays === 2)).toBe(true)
  })
})

describe('periodBounds', () => {
  const monday = new Date('2026-06-15T12:00:00') // понедельник

  it('days10: last 10 days including today', () => {
    expect(periodBounds('days10', null, null, monday)).toEqual(['2026-06-06', '2026-06-15'])
  })

  it('week: from Monday of this week to today', () => {
    expect(periodBounds('week', null, null, monday)).toEqual(['2026-06-15', '2026-06-15'])
    const wednesday = new Date('2026-06-17T12:00:00')
    expect(periodBounds('week', null, null, wednesday)).toEqual(['2026-06-15', '2026-06-17'])
  })

  it('last_week: the full previous Mon-Sun week', () => {
    expect(periodBounds('last_week', null, null, monday)).toEqual(['2026-06-08', '2026-06-14'])
  })

  it('month: from the 1st of this month to today', () => {
    expect(periodBounds('month', null, null, monday)).toEqual(['2026-06-01', '2026-06-15'])
  })

  it('all: no bounds', () => {
    expect(periodBounds('all', null, null, monday)).toEqual([null, null])
  })

  it('custom: passes through given bounds (or null)', () => {
    expect(periodBounds('custom', '2026-01-01', '2026-02-01', monday)).toEqual(['2026-01-01', '2026-02-01'])
    expect(periodBounds('custom', null, null, monday)).toEqual([null, null])
  })
})

describe('filterPointsByRange', () => {
  it('filters points to the resolved [from, to] bounds', () => {
    const points = [
      { date: '2026-06-01', y: 1 },
      { date: '2026-06-10', y: 2 },
      { date: '2026-06-20', y: 3 },
    ]
    const out = filterPointsByRange(points, 'custom', '2026-06-05', '2026-06-15')
    expect(out).toEqual([{ date: '2026-06-10', y: 2 }])
  })

  it('returns everything unfiltered for range=all', () => {
    const points = [{ date: '2026-06-01', y: 1 }]
    expect(filterPointsByRange(points, 'all', null, null)).toEqual(points)
  })
})
