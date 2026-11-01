import { isUnlocked, type AchievementState, type Unlocked } from './achievements'

// BACKLOG 78.6 «Коллекции-наборы», срез 1: тематические наборы из 3–5 достижений РАЗНЫХ разделов с полосой «N из M». Набор — производное от
// уже открытых достижений: ничего не хранится, поэтому ничего не ломает и не требует миграции. Награда за набор — отдельный срез (нужно
// решить, где её хранить). Ключи достижений проверяет тест collections.test.ts: переименование ключа в реестре без правки набора его уронит.
export interface CollectionDef {
  id: string
  keys: readonly string[]
}

export const COLLECTIONS: readonly CollectionDef[] = [
  { id: 'momentum', keys: ['first_weight', 'points_100', 'challenges_1', 'perfect_days_1', 'mega_productivity'] },
  { id: 'iron_habit', keys: ['workouts_10', 'streak_10', 'perfect_days_10', 'goals_streak_7'] },
  { id: 'knowledge', keys: ['books_5', 'skills_5', 'learned_10', 'words_25'] },
  { id: 'willpower', keys: ['goals_10', 'challenges_5', 'milestones_5', 'streak_30'] },
]

export interface CollectionState {
  id: string
  items: { state: AchievementState; unlocked: boolean }[]
  done: number
  total: number
  complete: boolean
}

// Состояние набора; ключи, которых нет в реестре, молча пропускаются (набор не должен ронять страницу).
export function collectionStates(states: AchievementState[], unlocked: Unlocked, defs: readonly CollectionDef[] = COLLECTIONS): CollectionState[] {
  const byKey = new Map(states.map((s) => [s.def.key, s]))
  return defs.map((c) => {
    const items = c.keys.flatMap((k) => {
      const state = byKey.get(k)
      return state ? [{ state, unlocked: isUnlocked(k, unlocked) }] : []
    })
    const done = items.filter((i) => i.unlocked).length
    return { id: c.id, items, done, total: items.length, complete: items.length > 0 && done === items.length }
  })
}
