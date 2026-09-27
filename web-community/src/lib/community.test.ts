import { describe, it, expect } from 'vitest'
import { visibleRows, leaderboardRows, medalIndex, todayRows, normalizeDisplayName, toFriendIdSet, friendDisplayName } from './community'
import type { LeaderboardRow, TodayActivityRow } from './types'

const me = 'me-id'

function row(overrides: Partial<LeaderboardRow>): LeaderboardRow {
  return { user_id: 'u', display_name: 'U', avatar_url: null, total_points: 0, perfect_streak: 0, leaderboard_visible: true, ...overrides }
}

describe('visibleRows / leaderboardRows', () => {
  it('shows visible rows plus always your own row, even if hidden', () => {
    const rows = [row({ user_id: me, leaderboard_visible: false }), row({ user_id: 'a', leaderboard_visible: true }), row({ user_id: 'b', leaderboard_visible: false })]
    const out = leaderboardRows(rows, me, 'everyone', new Set())
    expect(out.map((r) => r.user_id)).toEqual([me, 'a'])
  })

  it('scope=friends narrows to yourself + friend ids', () => {
    const rows = [row({ user_id: me }), row({ user_id: 'a' }), row({ user_id: 'b' })]
    const out = leaderboardRows(rows, me, 'friends', new Set(['a']))
    expect(out.map((r) => r.user_id)).toEqual([me, 'a'])
  })

  it('generic visibleRows works the same for any row shape with user_id/leaderboard_visible', () => {
    const rows = [{ user_id: me, leaderboard_visible: null }, { user_id: 'x', leaderboard_visible: false }]
    expect(visibleRows(rows, me, 'everyone', new Set()).map((r) => r.user_id)).toEqual([me])
  })
})

describe('medalIndex', () => {
  it('ranks 0-2 (top 3) get a medal, the rest do not', () => {
    expect(medalIndex(0)).toBe(0)
    expect(medalIndex(2)).toBe(2)
    expect(medalIndex(3)).toBeNull()
  })
})

describe('todayRows', () => {
  it('filters by visibility/scope then sorts by today_points desc', () => {
    const rows: TodayActivityRow[] = [
      { user_id: 'a', display_name: 'A', avatar_url: null, today_points: 3, items: null, notes: null, leaderboard_visible: true },
      { user_id: 'b', display_name: 'B', avatar_url: null, today_points: 9, items: null, notes: null, leaderboard_visible: true },
      { user_id: me, display_name: 'Me', avatar_url: null, today_points: 1, items: null, notes: null, leaderboard_visible: true },
    ]
    expect(todayRows(rows, me, 'everyone', new Set()).map((r) => r.user_id)).toEqual(['b', 'a', me])
  })
})

describe('normalizeDisplayName', () => {
  it('trims, empty string becomes null', () => {
    expect(normalizeDisplayName('  Alex  ')).toBe('Alex')
    expect(normalizeDisplayName('   ')).toBeNull()
    expect(normalizeDisplayName('')).toBeNull()
  })
})

describe('toFriendIdSet', () => {
  it('extracts followed_id into a Set', () => {
    const set = toFriendIdSet([{ followed_id: 'a' }, { followed_id: 'b' }])
    expect(set.has('a')).toBe(true)
    expect(set.has('c')).toBe(false)
  })
})

describe('friendDisplayName', () => {
  it('falls back to the placeholder when display_name is empty', () => {
    expect(friendDisplayName({ user_id: 'a', display_name: null, avatar_url: null }, 'No name')).toBe('No name')
    expect(friendDisplayName({ user_id: 'a', display_name: 'Alex', avatar_url: null }, 'No name')).toBe('Alex')
  })
})
