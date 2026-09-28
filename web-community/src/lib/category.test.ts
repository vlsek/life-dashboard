import { describe, it, expect } from 'vitest'
import { categoryRows, categoryChartPoints, defaultGoalSum, categoryLabel } from './category'
import type { CategoryLeaderboardRow } from './types'

const me = 'me'
function row(o: Partial<CategoryLeaderboardRow>): CategoryLeaderboardRow {
  return { user_id: 'u', display_name: 'U', avatar_url: null, total_value: 0, category_points: 0, category_streak: 0, leaderboard_visible: true, ...o }
}

describe('categoryRows', () => {
  it('drops hidden users and users with no activity, but always keeps yourself', () => {
    const rows = [
      row({ user_id: me }), // ни очков, ни суммы — но это ты
      row({ user_id: 'idle' }), // пусто — скрыт
      row({ user_id: 'hidden', total_value: 50, leaderboard_visible: false }),
      row({ user_id: 'a', total_value: 10 }),
    ]
    expect(categoryRows(rows, me, 'everyone', new Set(), 'value').map((r) => r.user_id)).toEqual(['a', me])
  })

  it('sorts by the chosen mode, descending', () => {
    const rows = [
      row({ user_id: 'a', total_value: 100, category_points: 1, category_streak: 9 }),
      row({ user_id: 'b', total_value: 10, category_points: 5, category_streak: 2 }),
      row({ user_id: 'c', total_value: 50, category_points: 3, category_streak: 4 }),
    ]
    const ids = (mode: 'value' | 'points' | 'streak') => categoryRows(rows, me, 'everyone', new Set(), mode).map((r) => r.user_id)
    expect(ids('value')).toEqual(['a', 'c', 'b'])
    expect(ids('points')).toEqual(['b', 'c', 'a'])
    expect(ids('streak')).toEqual(['a', 'c', 'b'])
  })

  it('friends scope keeps only yourself and friends', () => {
    const rows = [row({ user_id: 'a', total_value: 1 }), row({ user_id: 'b', total_value: 2 }), row({ user_id: me })]
    expect(categoryRows(rows, me, 'friends', new Set(['b']), 'value').map((r) => r.user_id)).toEqual(['b', me])
  })
})

describe('categoryChartPoints', () => {
  it('sums several metrics per day, parsing string values like the original', () => {
    const values = [
      { date: '2026-06-02', value: '10' },
      { date: '2026-06-01', value: 5 },
      { date: '2026-06-01', value: '2.5' },
      { date: '2026-06-03', value: 'oops' }, // не число -> 0, день всё равно остаётся
    ]
    expect(categoryChartPoints(values, 'all', null, null)).toEqual([
      { date: '2026-06-01', y: 7.5 },
      { date: '2026-06-02', y: 10 },
      { date: '2026-06-03', y: 0 },
    ])
  })

  it('applies the period filter', () => {
    const values = [
      { date: '2026-06-01', value: 1 },
      { date: '2026-06-10', value: 2 },
    ]
    expect(categoryChartPoints(values, 'custom', '2026-06-05', '2026-06-15')).toEqual([{ date: '2026-06-10', y: 2 }])
  })
})

describe('defaultGoalSum', () => {
  it('sums goals, null when there are none', () => {
    expect(defaultGoalSum([{ goal_value: 20 }, { goal_value: 30 }, { goal_value: null }])).toBe(50)
    expect(defaultGoalSum([{ goal_value: null }])).toBeNull()
    expect(defaultGoalSum([])).toBeNull()
  })
})

describe('categoryLabel', () => {
  it('joins ru / en labels', () => {
    expect(categoryLabel({ label_ru: 'Отжимания', label_en: 'Push-ups' })).toBe('Отжимания / Push-ups')
  })
})
