// Баланс баллов для карточки профиля. КОПИЯ логики из web-shop/src/lib/points.ts (по принятому
// правилу пилота — копировать, а не импортировать между папками); в оригинале это
// calcTotalPoints()/calcBalance() в config.js. Типы свои, минимальные.

import { isMetricDone, metricDayPointsTenths } from './metrics'
import type { Metric, PlannedSetsEntry } from './types'

export type BalanceMetric = { id: string; type: string; goal_value: number | null; goal_direction: string | null; planned_sets_log?: PlannedSetsEntry[] | null }
export type BalanceValueRow = { date: string; metric_id: string; value: unknown }

// Правило «выполнено» — одно на весь Дашборд (lib/metrics.ts, включая «N подходов в день», миграция 041): баланс, журнал баллов и
// кольца не должны расходиться. dateStr обязателен для ПРОШЛЫХ дней — прошлое не пересчитываем.
export function isDone(metric: BalanceMetric, value: unknown, dateStr?: string): boolean {
  return isMetricDone(metric as unknown as Metric, value as never, dateStr)
}

// Баллы метрики за день в ДЕСЯТЫХ долях (10 = 1 балл; дробные — подходы с планом, миграция 045). Та же функция, что у колец и графика.
export function dayPointsTenths(metric: BalanceMetric, value: unknown, dateStr?: string): number {
  return metricDayPointsTenths(metric as unknown as Metric, value as never, dateStr)
}

export function calcBalance(
  metrics: BalanceMetric[],
  values: BalanceValueRow[],
  doneGoals: { points: number | null }[],
  masteredSkills: { points: number | null }[],
  doneBooks: { points: number | null }[],
  redeemedCosts: (number | null)[],
  // Бонусные монеты за достижения (миграция 051, BACKLOG раздел 37): ВХОДЯТ в баланс, но НЕ в «накоплено» (total) — иначе награда сама
  // открывала бы значки «100/500/1000 баллов» и поднимала рейтинг. Баланс = накоплено + бонус − потрачено.
  bonusCoins: (number | null)[] = [],
): { total: number; spent: number; bonus: number; balance: number } {
  const byDay: Record<string, Record<string, unknown>> = {}
  for (const v of values) (byDay[v.date] ||= {})[v.metric_id] = v.value
  // Считаем в десятых долях целыми числами и делим один раз в конце — без хвоста плавающей точки (12.3, а не 12.299999999999999)
  let dailyTenths = 0
  for (const d of Object.keys(byDay)) for (const m of metrics) dailyTenths += dayPointsTenths(m, byDay[d][m.id], d)
  const otherPoints =
    doneGoals.reduce((s, g) => s + (g.points ?? 5), 0) +
    masteredSkills.reduce((s, x) => s + (x.points ?? 10), 0) +
    doneBooks.reduce((s, b) => s + (b.points ?? 10), 0)
  const spent = redeemedCosts.reduce<number>((s, c) => s + (c ?? 0), 0)
  const totalTenths = dailyTenths + Math.round(otherPoints * 10)
  const bonusTenths = bonusCoins.reduce<number>((s, c) => s + Math.round((c ?? 0) * 10), 0)
  return { total: totalTenths / 10, spent, bonus: bonusTenths / 10, balance: (totalTenths + bonusTenths - Math.round(spent * 10)) / 10 }
}
