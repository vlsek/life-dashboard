import { describe, expect, it } from 'vitest'
import { friendStats } from './friendCards'
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
