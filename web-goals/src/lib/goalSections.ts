import { daysUntil } from './goals'
import type { Goal } from './types'

// Подраздел «Ближайшие сроки» (BACKLOG 44.2): невыполненные цели с дедлайном — просроченные и в ближайшие `windowDays` дней, по возрастанию срока.
export const UPCOMING_WINDOW_DAYS = 14

export function upcomingDeadlines(active: Goal[], today: Date = new Date(), windowDays = UPCOMING_WINDOW_DAYS): Goal[] {
  return active
    .filter((g) => !g.done && g.deadline && daysUntil(g.deadline, today) <= windowDays)
    .slice()
    .sort((a, b) => (a.deadline as string).localeCompare(b.deadline as string))
}

// Мини-прогресс категории (BACKLOG 44.2, срез 2): сколько целей категории выполнено из всех её целей (активных и выполненных).
export interface CategoryProgress {
  done: number
  total: number
}

export function categoryProgress(all: Goal[], noCategoryLabel: string): Record<string, CategoryProgress> {
  const out: Record<string, CategoryProgress> = {}
  for (const g of all) {
    const key = g.category || noCategoryLabel
    const p = (out[key] ??= { done: 0, total: 0 })
    p.total++
    if (g.done) p.done++
  }
  return out
}
