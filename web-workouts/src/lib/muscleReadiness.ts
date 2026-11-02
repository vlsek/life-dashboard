import { daysAgo } from './muscleStats'

// BACKLOG 80.3 «Готовность», срез 1: «только что нагружена → восстанавливается → готова» по дням после последней тренировки и числу её подходов.
// Ориентир 48 ч; после тяжёлой тренировки (≥ HEAVY_SETS рабочих подходов на группу) +1 день. RPE (69.4) и ручная правка — позже. Это оценка, не диагноз.
export type Readiness = 'loaded' | 'recovering' | 'ready'
export const BASE_REST_DAYS = 2
export const HEAVY_SETS = 8

export function readiness(lastDate: string | null | undefined, lastSets: number, today: string): Readiness | null {
  const d = daysAgo(lastDate ?? undefined, today)
  if (d === null) return null
  const need = BASE_REST_DAYS + (lastSets >= HEAVY_SETS ? 1 : 0)
  if (d >= need) return 'ready'
  return d === need - 1 ? 'recovering' : 'loaded'
}
