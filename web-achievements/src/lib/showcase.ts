import { isUnlocked, type AchievementGroup, type AchievementState, type Unlocked } from './achievements'
import { gradeOf } from './grade'
import type { Rarity } from './rewards'

// Витрина и фильтр страницы «Достижения» (BACKLOG 44.12, срез 2). Чистые функции — без Vue и без запросов.

export type GradeFilter = 'all' | Rarity

// «Последние»: открытые с настоящей датой (null — «выполнено ещё до раздела», даты нет), новые сверху.
export function recentUnlocked(states: AchievementState[], unlocked: Unlocked, limit = 4): AchievementState[] {
  return states
    .filter((s) => isUnlocked(s.def.key, unlocked) && !!unlocked[s.def.key] && !Number.isNaN(new Date(unlocked[s.def.key] as string).getTime()))
    .sort((a, b) => new Date(unlocked[b.def.key] as string).getTime() - new Date(unlocked[a.def.key] as string).getTime())
    .slice(0, limit)
}

// «Ближе всего»: ещё закрытые, по которым уже есть движение; сверху те, у кого осталась меньшая доля пути.
export function closestLocked(states: AchievementState[], unlocked: Unlocked, limit = 3): AchievementState[] {
  return states
    .filter((s) => !isUnlocked(s.def.key, unlocked) && s.progress > 0 && !s.met)
    .sort((a, b) => b.progress - a.progress || a.def.target - b.def.target)
    .slice(0, limit)
}

// Сколько осталось до цели (целое, не меньше 0)
export function remaining(s: AchievementState): number {
  return Math.max(0, Math.ceil(s.def.target - s.value))
}

// Фильтр по грейду: оставляет в группах только подходящие карточки, пустые группы убирает; счётчик группы — по оставшимся.
export function filterGroups(groups: AchievementGroup[], unlocked: Unlocked, grade: GradeFilter): AchievementGroup[] {
  if (grade === 'all') return groups
  return groups
    .map((g) => {
      const items = g.items.filter((s) => gradeOf(s.def.key) === grade)
      return { group: g.group, items, unlockedCount: items.filter((s) => isUnlocked(s.def.key, unlocked)).length }
    })
    .filter((g) => g.items.length > 0)
}
