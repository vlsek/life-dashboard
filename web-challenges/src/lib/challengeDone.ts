import { computeCumulativeStats, computeDailyStats } from './challenges'
import type { Challenge, ChallengeEntry } from './types'

// Поздравление с завершением челленджа (BACKLOG 642). Награды идут через лесенку достижений «Челленджи» (web-achievements:
// challenges_1/5/10/25 по числу ЗАВЕРШЁННЫХ челленджей), поэтому окно говорит только о том, открылось ли достижение:
// ровно когда число завершённых совпало с шагом лесенки. Менять шаги — вместе с web-achievements/src/lib/achievements.ts.
export const LADDER_STEPS = [1, 5, 10, 25] as const

export function ladderStep(doneCount: number): (typeof LADDER_STEPS)[number] | null {
  return (LADDER_STEPS as readonly number[]).includes(doneCount) ? (doneCount as (typeof LADDER_STEPS)[number]) : null
}

export type DoneSummary = { kind: 'days'; done: number; total: number } | { kind: 'count'; count: number; target: number; itemWord: string }

// Итог для окна: дневной — «выполнено дней X из N», накопительный — «собрано X из N».
export function doneSummary(ch: Challenge, entries: ChallengeEntry[], today: string): DoneSummary {
  if (ch.type === 'cumulative_count') {
    const s = computeCumulativeStats(ch, entries)
    return { kind: 'count', count: s.count, target: s.target, itemWord: s.itemWord }
  }
  const s = computeDailyStats(ch, entries, today)
  return { kind: 'days', done: s.completedCount, total: s.duration }
}
