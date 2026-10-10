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
