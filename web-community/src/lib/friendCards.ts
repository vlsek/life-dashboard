import type { LeaderboardRow } from './types'

export interface FriendStats {
  points: number
  streak: number
}

// Баллы и серия друга из строк лидерборда выбранного периода; нет строки (скрыт из лидерборда) → null.
export function friendStats(rows: LeaderboardRow[], userId: string): FriendStats | null {
  const r = rows.find((x) => x.user_id === userId)
  if (!r || r.leaderboard_visible === false) return null
  return { points: Number(r.total_points) || 0, streak: r.perfect_streak || 0 }
}
