import type { FollowedProfile, LeaderboardRow } from './types'

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

// 🐞 BACKLOG раздел 34 («Друзья: пишет «Пока ни на кого не подписан», а это не так»): профили друзей читаются отдельным запросом к profiles.
// Если он ничего не вернул (права на чужие профили, ошибка, удалённый профиль), список был пуст и подпись врала, хотя подписки есть
// (по ним же работает фильтр «Только друзья»). Теперь каждый id получает карточку: найденные профили — как есть, остальные — заглушка
// без имени (её можно убрать крестиком), а имя и аватар по возможности берутся из лидерборда (enrichFromLeaderboard).
export function withFallbackProfiles(ids: Iterable<string>, found: FollowedProfile[]): FollowedProfile[] {
  const byId = new Map(found.map((p) => [p.user_id, p]))
  const out: FollowedProfile[] = []
  for (const id of ids) out.push(byId.get(id) ?? { user_id: id, display_name: null, avatar_url: null })
  return out
}

// Пустые имя и аватар (заглушка или профиль без имени) берём из строки лидерборда; уже заполненные не трогаем.
export function enrichFromLeaderboard(profiles: FollowedProfile[], rows: LeaderboardRow[]): FollowedProfile[] {
  if (!rows.length) return profiles
  const byId = new Map(rows.map((r) => [r.user_id, r]))
  return profiles.map((p) => {
    const r = byId.get(p.user_id)
    if (!r || (p.display_name && p.avatar_url)) return p
    return { ...p, display_name: p.display_name || r.display_name || null, avatar_url: p.avatar_url || r.avatar_url || null }
  })
}
