import { describe, expect, it } from 'vitest'
import { enrichFromLeaderboard, friendStats, withFallbackProfiles } from './friendCards'
import type { LeaderboardRow } from './types'

const row = (id: string, pts: number | string, streak = 0, visible: boolean | null = true): LeaderboardRow => ({
  user_id: id, display_name: id, avatar_url: null, total_points: pts as number, perfect_streak: streak, leaderboard_visible: visible,
})

describe('friendStats', () => {
  it('баллы и серия из строки', () => {
    expect(friendStats([row('a', 12, 3)], 'a')).toEqual({ points: 12, streak: 3 })
  })
  it('numeric строкой', () => {
    expect(friendStats([row('a', '7.5')], 'a')).toEqual({ points: 7.5, streak: 0 })
  })
  it('нет строки или скрыт — null', () => {
    expect(friendStats([row('a', 1)], 'b')).toBeNull()
    expect(friendStats([row('a', 1, 0, false)], 'a')).toBeNull()
  })
  it('leaderboard_visible null считается видимым (как в visibleRows)', () => {
    expect(friendStats([row('a', 2, 0, null)], 'a')).toEqual({ points: 2, streak: 0 })
  })
})

describe('withFallbackProfiles — карточка есть у каждого друга, даже если профиль не прочитался', () => {
  it('найденные профили как есть, недостающие — заглушки без имени, порядок по ids', () => {
    const found = [{ user_id: 'b', display_name: 'Bob', avatar_url: 'u' }]
    expect(withFallbackProfiles(['a', 'b', 'c'], found)).toEqual([
      { user_id: 'a', display_name: null, avatar_url: null },
      { user_id: 'b', display_name: 'Bob', avatar_url: 'u' },
      { user_id: 'c', display_name: null, avatar_url: null },
    ])
  })
  it('профилей нет вовсе — все заглушки; ids пусты — пусто; чужой профиль (не из ids) не попадает', () => {
    expect(withFallbackProfiles(['a'], [])).toEqual([{ user_id: 'a', display_name: null, avatar_url: null }])
    expect(withFallbackProfiles([], [{ user_id: 'x', display_name: 'X', avatar_url: null }])).toEqual([])
  })
  it('принимает Set, как friendIds', () => {
    expect(withFallbackProfiles(new Set(['a', 'b']), [])).toHaveLength(2)
  })
})

describe('enrichFromLeaderboard — имя и аватар из лидерборда, где профиль пуст', () => {
  const rows = [row('a', 5), { ...row('b', 1), display_name: 'Bee', avatar_url: 'bee.png' }]
  it('заглушка получает имя и аватар из строки лидерборда', () => {
    expect(enrichFromLeaderboard([{ user_id: 'b', display_name: null, avatar_url: null }], rows)).toEqual([{ user_id: 'b', display_name: 'Bee', avatar_url: 'bee.png' }])
  })
  it('заполненные поля профиля не затираются (имя из профиля, аватар из лидерборда)', () => {
    expect(enrichFromLeaderboard([{ user_id: 'b', display_name: 'Моё имя', avatar_url: null }], rows)).toEqual([{ user_id: 'b', display_name: 'Моё имя', avatar_url: 'bee.png' }])
    const full = { user_id: 'b', display_name: 'Моё имя', avatar_url: 'mine.png' }
    expect(enrichFromLeaderboard([full], rows)[0]).toBe(full)
  })
  it('друга нет в лидерборде или лидерборд пуст — профиль без изменений', () => {
    const p = [{ user_id: 'z', display_name: null, avatar_url: null }]
    expect(enrichFromLeaderboard(p, rows)).toEqual(p)
    expect(enrichFromLeaderboard(p, [])).toBe(p)
  })
})
