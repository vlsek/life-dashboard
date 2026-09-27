import type { FollowedProfile, LeaderboardRow, TodayActivityRow, Scope } from './types'

// Портировано из loadLeaderboard() в community.js: видно, если сам включил видимость,
// ИЛИ это ты сам (себя видишь всегда, даже спрятавшись от остальных); опционально сузить
// до только друзей.
export function visibleRows<T extends { user_id: string; leaderboard_visible?: boolean | null }>(
  rows: T[],
  myUserId: string,
  scope: Scope,
  friendIds: Set<string>,
): T[] {
  let out = rows.filter((r) => r.leaderboard_visible !== false || r.user_id === myUserId)
  if (scope === 'friends') out = out.filter((r) => r.user_id === myUserId || friendIds.has(r.user_id))
  return out
}

// Портировано из loadLeaderboard(): лидерборд приходит с сервера уже отсортированным по
// total_points (get_leaderboard RPC), фильтрация — единственное, что делает клиент.
export function leaderboardRows(rows: LeaderboardRow[], myUserId: string, scope: Scope, friendIds: Set<string>): LeaderboardRow[] {
  return visibleRows(rows, myUserId, scope, friendIds)
}

// Медаль для мест 1-3, иначе просто номер по порядку — портировано из loadLeaderboard().
export function medalIndex(rank: number): number | null {
  return rank < 3 ? rank : null // rank — 0-based индекс в уже отфильтрованном списке
}

// Портировано из loadToday(): фильтр видимости + сортировка по очкам за сегодня, по убыванию.
export function todayRows(rows: TodayActivityRow[], myUserId: string, scope: Scope, friendIds: Set<string>): TodayActivityRow[] {
  return visibleRows(rows, myUserId, scope, friendIds).slice().sort((a, b) => b.today_points - a.today_points)
}

// Портировано из renderFriendsCard()/editDisplayName(): пустое имя = не задано (NULL в базе).
export function normalizeDisplayName(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed || null
}

// follows -> Set(followed_id) — портировано из loadFriendIds().
export function toFriendIdSet(follows: { followed_id: string }[]): Set<string> {
  return new Set(follows.map((f) => f.followed_id))
}

// Портировано из renderFriendsCard(): пустое имя профиля друга — плейсхолдер, не пустая строка.
export function friendDisplayName(p: FollowedProfile, noNameLabel: string): string {
  return p.display_name || noNameLabel
}
