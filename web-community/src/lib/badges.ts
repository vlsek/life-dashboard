import type { BadgeRow } from './types'

// Значки достижений в Сообществе (BACKLOG 393, третий срез). Реестр — КОПИЯ ключей/иконок из web-achievements/src/lib/achievements.ts
// (менять вместе; страж badges.test.ts сверяет ключи с реестром страницы «Достижения»). Данные приходят из RPC get_public_badges()
// (миграция 047): свои значки и значки тех, кто виден в лидерборде. Неизвестный ключ (новое достижение) просто не рисуем.
export interface BadgeDef {
  key: string
  group: string
  target: number
  icon: string
}

export const BADGES: readonly BadgeDef[] = [
  { key: 'first_metric', group: 'first', target: 1, icon: 'done' },
  { key: 'first_weight', group: 'first', target: 1, icon: 'scale' },
  { key: 'first_goal', group: 'first', target: 1, icon: 'goals' },
  { key: 'first_skill', group: 'first', target: 1, icon: 'skills' },
  { key: 'first_book', group: 'first', target: 1, icon: 'book' },
  { key: 'first_workout', group: 'first', target: 1, icon: 'dumbbell' },
  { key: 'streak_5', group: 'streak', target: 5, icon: 'flame' },
  { key: 'streak_10', group: 'streak', target: 10, icon: 'flame' },
  { key: 'streak_30', group: 'streak', target: 30, icon: 'flame' },
  { key: 'streak_100', group: 'streak', target: 100, icon: 'flame' },
  { key: 'points_100', group: 'points', target: 100, icon: 'coin' },
  { key: 'points_500', group: 'points', target: 500, icon: 'coin' },
  { key: 'points_1000', group: 'points', target: 1000, icon: 'coin' },
  { key: 'workouts_10', group: 'workouts', target: 10, icon: 'dumbbell' },
  { key: 'workouts_50', group: 'workouts', target: 50, icon: 'dumbbell' },
  { key: 'challenges_1', group: 'challenges', target: 1, icon: 'challenges' },
  { key: 'challenges_5', group: 'challenges', target: 5, icon: 'challenges' },
  { key: 'goals_10', group: 'goals', target: 10, icon: 'goals' },
  { key: 'books_5', group: 'books', target: 5, icon: 'book' },
  { key: 'mega_productivity', group: 'weeks', target: 1, icon: 'pulse' },
]

const BY_KEY = new Map(BADGES.map((b) => [b.key, b]))
export const badgeDef = (key: string): BadgeDef | undefined => BY_KEY.get(key)

// Ценность значка для показа «сверху»: чем выше порог внутри группы и чем «весомее» группа, тем выше. Простое правило:
// сначала по порогу (больше — выше), при равенстве — по порядку реестра. «Первые» (порог 1) идут последними.
function weight(b: BadgeDef): number {
  return b.target
}

// userId → ключи его значков по убыванию ценности (без дублей и неизвестных).
export function badgesByUser(rows: BadgeRow[]): Map<string, string[]> {
  const out = new Map<string, Set<string>>()
  for (const r of rows) {
    if (!BY_KEY.has(r.key)) continue
    const set = out.get(r.user_id) ?? new Set<string>()
    set.add(r.key)
    out.set(r.user_id, set)
  }
  const sorted = new Map<string, string[]>()
  for (const [uid, set] of out) {
    const order = [...set].sort((a, b) => weight(BY_KEY.get(b)!) - weight(BY_KEY.get(a)!) || BADGES.indexOf(BY_KEY.get(a)!) - BADGES.indexOf(BY_KEY.get(b)!))
    sorted.set(uid, order)
  }
  return sorted
}

// До `max` самых ценных значков и сколько осталось скрытыми.
export function topBadges(keys: string[] | undefined, max: number): { shown: string[]; more: number } {
  const all = keys ?? []
  return { shown: all.slice(0, max), more: Math.max(0, all.length - max) }
}
