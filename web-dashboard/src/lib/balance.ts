// Баланс баллов для карточки профиля. КОПИЯ логики из web-shop/src/lib/points.ts (по принятому
// правилу пилота — копировать, а не импортировать между папками); в оригинале это
// calcTotalPoints()/calcBalance() в config.js. Типы свои, минимальные.

import { isMetricDone } from './metrics'
import type { Metric, PlannedSetsEntry } from './types'

export type BalanceMetric = { id: string; type: string; goal_value: number | null; goal_direction: string | null; planned_sets_log?: PlannedSetsEntry[] | null }
export type BalanceValueRow = { date: string; metric_id: string; value: unknown }

// Правило «выполнено» — одно на весь Дашборд (lib/metrics.ts, включая «N подходов в день», миграция 041): баланс, журнал баллов и
// кольца не должны расходиться. dateStr обязателен для ПРОШЛЫХ дней — прошлое не пересчитываем.
export function isDone(metric: BalanceMetric, value: unknown, dateStr?: string): boolean {
  return isMetricDone(metric as unknown as Metric, value as never, dateStr)
}

export function calcBalance(
  metrics: BalanceMetric[],
  values: BalanceValueRow[],
  doneGoals: { points: number | null }[],
  masteredSkills: { points: number | null }[],
  doneBooks: { points: number | null }[],
  redeemedCosts: (number | null)[],
): { total: number; spent: number; balance: number } {
  const byDay: Record<string, Record<string, unknown>> = {}
  for (const v of values) (byDay[v.date] ||= {})[v.metric_id] = v.value
  let daily = 0
  for (const d of Object.keys(byDay)) for (const m of metrics) if (isDone(m, byDay[d][m.id], d)) daily++
  const total =
    daily +
    doneGoals.reduce((s, g) => s + (g.points ?? 5), 0) +
    masteredSkills.reduce((s, x) => s + (x.points ?? 10), 0) +
    doneBooks.reduce((s, b) => s + (b.points ?? 10), 0)
  const spent = redeemedCosts.reduce<number>((s, c) => s + (c ?? 0), 0)
  return { total, spent, balance: total - spent }
}
