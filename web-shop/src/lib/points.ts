import type { DailyValue, GoalRow, SkillRow, BookRow, Metric, MetricValue, SetEntry } from './types'

// Портировано 1:1 из metricNumericValue() в config.js.
export function metricNumericValue(metric: Pick<Metric, 'type'>, value: MetricValue): number | null {
  if (value == null) return null
  if (metric.type === 'sets' && Array.isArray(value)) {
    return (value as SetEntry[]).reduce((sum, s) => sum + (s?.reps || 0), 0)
  }
  return typeof value === 'number' ? value : null
}

// Портировано 1:1 из isMetricDone() в config.js.
export function isMetricDone(metric: Metric, value: MetricValue): boolean {
  if (value === null || value === undefined) return false
  if (metric.type === 'boolean') return value === true
  if (metric.type === 'multiselect') return Array.isArray(value) && (value as string[]).length > 0
  if (metric.type === 'number' || metric.type === 'sets') {
    const numeric = metricNumericValue(metric, value)
    if (numeric == null) return false
    const goal = metric.goal_value ?? 0
    if (metric.goal_direction === 'at_most') return numeric > 0 && numeric < goal
    return numeric >= goal
  }
  return false
}

// Портировано 1:1 из calcTotalPoints() в config.js: 1 балл за каждый выполненный день
// метрики (по всем дням истории) + баллы за выполненные цели/освоенные навыки/дочитанные
// книги. Вызывающий код (useBalance.ts) достаёт таблицы из Supabase, эта функция —
// чистый расчёт, чтобы её можно было протестировать без сети.
export function calcTotalPoints(activeMetrics: Metric[], allValues: DailyValue[], doneGoals: GoalRow[], masteredSkills: SkillRow[], doneBooks: BookRow[]): number {
  const byDay: Record<string, Record<string, MetricValue>> = {}
  for (const v of allValues) {
    byDay[v.date] = byDay[v.date] || {}
    byDay[v.date][v.metric_id] = v.value
  }

  let dailyPoints = 0
  for (const dateStr of Object.keys(byDay)) {
    for (const m of activeMetrics) {
      if (isMetricDone(m, byDay[dateStr][m.id])) dailyPoints++
    }
  }

  const goalPoints = doneGoals.reduce((sum, g) => sum + (g.points ?? 5), 0)
  const skillPoints = masteredSkills.reduce((sum, s) => sum + (s.points ?? 10), 0)
  const bookPoints = doneBooks.reduce((sum, b) => sum + (b.points ?? 10), 0)

  return dailyPoints + goalPoints + skillPoints + bookPoints
}

// Портировано из calcBalance() в config.js: total (см. выше) минус стоимость уже купленных
// товаров магазина.
export function calcBalanceFromTotals(total: number, redeemedItemCosts: number[]): { total: number; spent: number; balance: number } {
  const spent = redeemedItemCosts.reduce((sum, c) => sum + (c ?? 0), 0)
  return { total, spent, balance: total - spent }
}
