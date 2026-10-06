import { describe, expect, it } from 'vitest'
import { FEED_MAX, canPickMore, feedAge, feedRows, normalizeFeedPick, togglePick } from './achievementFeed'
import type { FeedRow } from './types'

const row = (user_id: string, key: string, unlocked_at: string): FeedRow => ({ user_id, display_name: user_id, avatar_url: null, key, unlocked_at })

describe('normalizeFeedPick', () => {
  it('не массив → пусто', () => {
    expect(normalizeFeedPick(null)).toEqual([])
    expect(normalizeFeedPick('streak_30')).toEqual([])
  })
  it('выбрасывает неизвестные ключи, не-строки и повторы', () => {
    expect(normalizeFeedPick(['streak_30', 'nope', 7, 'streak_30', 'goals_10'])).toEqual(['streak_30', 'goals_10'])
  })
  it('не больше пяти — остальные отбрасываются', () => {
    const six = ['first_goal', 'streak_5', 'streak_10', 'streak_30', 'points_100', 'points_500']
    expect(normalizeFeedPick(six)).toEqual(six.slice(0, FEED_MAX))
  })
  it('с набором открытых — только открытые', () => {
    expect(normalizeFeedPick(['streak_30', 'goals_10'], new Set(['goals_10']))).toEqual(['goals_10'])
  })
})

describe('togglePick', () => {
  it('добавляет и снимает', () => {
    expect(togglePick([], 'streak_30')).toEqual(['streak_30'])
    expect(togglePick(['streak_30', 'goals_10'], 'streak_30')).toEqual(['goals_10'])
  })
  it('на максимуме новый не добавляется, а снять можно', () => {
    const full = ['first_goal', 'streak_5', 'streak_10', 'streak_30', 'points_100']
    expect(canPickMore(full)).toBe(false)
    expect(togglePick(full, 'points_500')).toEqual(full)
    expect(togglePick(full, 'streak_5')).toHaveLength(4)
  })
  it('не меняет исходный массив', () => {
    const a = ['streak_30']
    togglePick(a, 'goals_10')
    expect(a).toEqual(['streak_30'])
  })
})

describe('feedRows', () => {
  const rows = [
    row('a', 'streak_30', '2026-10-03T10:00:00Z'),
    row('b', 'goals_10', '2026-10-05T10:00:00Z'),
    row('c', 'unknown_key', '2026-10-06T10:00:00Z'),
    row('a', 'first_goal', '2026-10-04T10:00:00Z'),
    row('me', 'books_5', '2026-10-01T10:00:00Z'),
  ]
  it('новые сверху, неизвестные ключи не показываем', () => {
    expect(feedRows(rows, 'me', 'everyone', new Set()).map((r) => r.key)).toEqual(['goals_10', 'first_goal', 'streak_30', 'books_5'])
  })
  it('«Только друзья» — друзья и я', () => {
    expect(feedRows(rows, 'me', 'friends', new Set(['b'])).map((r) => r.user_id)).toEqual(['b', 'me'])
  })
  it('лимит и пустой/битый момент времени', () => {
    expect(feedRows(rows, 'me', 'everyone', new Set(), 2)).toHaveLength(2)
    expect(feedRows([row('a', 'streak_30', 'не дата')], 'me', 'everyone', new Set())).toEqual([])
  })
})

describe('feedAge', () => {
  const now = new Date(2026, 9, 6, 12, 0, 0) // 6 октября, локально
  it('сегодня / вчера / N дней — по локальным датам', () => {
    expect(feedAge(new Date(2026, 9, 6, 0, 5).toISOString(), now).kind).toBe('today')
    expect(feedAge(new Date(2026, 9, 5, 23, 55).toISOString(), now).kind).toBe('yesterday')
    expect(feedAge(new Date(2026, 9, 1, 9, 0).toISOString(), now)).toEqual({ kind: 'days', days: 5 })
  })
  it('время из будущего и мусор — «сегодня»', () => {
    expect(feedAge(new Date(2026, 9, 9).toISOString(), now).kind).toBe('today')
    expect(feedAge('мусор', now).kind).toBe('today')
  })
})
