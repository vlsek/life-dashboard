import { describe, expect, it } from 'vitest'
import { STREAK_FLAME_THRESHOLDS, streakDays, streakFlameTier } from './streakFlameTier'

describe('streakFlameTier: ступени «живого пламени» (BACKLOG 18)', () => {
  it('пороги 7 / 30 / 100 дней', () => {
    expect([...STREAK_FLAME_THRESHOLDS]).toEqual([7, 30, 100])
  })
  it('меньше 7 дней — ступень 0 (обычный огонёк)', () => {
    for (const d of [0, 1, 6, 6.9]) expect(streakFlameTier(d), String(d)).toBe(0)
  })
  it('границы включительно: 7 → 1, 30 → 2, 100 → 3', () => {
    expect(streakFlameTier(7)).toBe(1)
    expect(streakFlameTier(29)).toBe(1)
    expect(streakFlameTier(30)).toBe(2)
    expect(streakFlameTier(99)).toBe(2)
    expect(streakFlameTier(100)).toBe(3)
    expect(streakFlameTier(1000)).toBe(3)
  })
  it('не число / нет значения / отрицательное → 0 и не падает', () => {
    expect(streakFlameTier(undefined)).toBe(0)
    expect(streakFlameTier(null)).toBe(0)
    expect(streakFlameTier(NaN)).toBe(0)
    expect(streakFlameTier(Infinity)).toBe(0)
    expect(streakFlameTier(-5)).toBe(0)
  })
})

describe('streakDays', () => {
  it('дневные серии — как есть, недельные (unit "w") — недели × 7', () => {
    expect(streakDays(12)).toBe(12)
    expect(streakDays(3, 'w')).toBe(21)
    expect(streakDays(1, 'w')).toBe(7)
  })
})
