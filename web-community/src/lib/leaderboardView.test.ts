import { describe, expect, it } from 'vitest'
import { formatPoints, initials, myPlace, podiumSlots, restRows, PERIODS } from './leaderboardView'
import type { LeaderboardRow } from './types'

const row = (id: string, pts = 0): LeaderboardRow => ({ user_id: id, display_name: id, avatar_url: null, total_points: pts, perfect_streak: 0, leaderboard_visible: true })
const rows = (n: number) => Array.from({ length: n }, (_, i) => row('u' + (i + 1), 100 - i))

describe('formatPoints', () => {
  it('целые без .0, дробные с одним знаком', () => {
    expect(formatPoints(12)).toBe('12')
    expect(formatPoints(12.0)).toBe('12')
    expect(formatPoints(12.34)).toBe('12.3')
    expect(formatPoints(0.1 + 0.2)).toBe('0.3')
  })
  it('numeric строкой и мусор', () => {
    expect(formatPoints('7.5')).toBe('7.5')
    expect(formatPoints('abc')).toBe('0')
    expect(formatPoints(null)).toBe('0')
    expect(formatPoints(undefined)).toBe('0')
  })
})

describe('initials', () => {
  it('две первые буквы слов, верхний регистр', () => {
    expect(initials('анна новак')).toBe('АН')
    expect(initials('  Дмитрий ')).toBe('Д')
    expect(initials('a b c')).toBe('AB')
  })
  it('пусто → ?', () => {
    expect(initials('')).toBe('?')
    expect(initials(null)).toBe('?')
  })
})

describe('podiumSlots', () => {
  it('порядок 2-е, 1-е, 3-е', () => {
    expect(podiumSlots(rows(5)).map((s) => s.rank)).toEqual([2, 1, 3])
    expect(podiumSlots(rows(5)).map((s) => s.row.user_id)).toEqual(['u2', 'u1', 'u3'])
  })
  it('меньше трёх: только имеющиеся', () => {
    expect(podiumSlots(rows(2)).map((s) => s.rank)).toEqual([2, 1])
    expect(podiumSlots(rows(1)).map((s) => s.rank)).toEqual([1])
    expect(podiumSlots([])).toEqual([])
  })
})

describe('restRows / myPlace', () => {
  it('остальные с 4-го места', () => {
    expect(restRows(rows(6)).map((r) => r.rank)).toEqual([4, 5, 6])
    expect(restRows(rows(3))).toEqual([])
  })
  it('моё место', () => {
    expect(myPlace(rows(5), 'u4')?.rank).toBe(4)
    expect(myPlace(rows(5), 'nobody')).toBeNull()
  })
  it('периоды', () => {
    expect(PERIODS).toEqual(['week', 'month', 'all'])
  })
})
