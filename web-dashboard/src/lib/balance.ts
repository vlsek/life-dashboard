// Баланс баллов для карточки профиля. КОПИЯ логики из web-shop/src/lib/points.ts (по принятому
// правилу пилота — копировать, а не импортировать между папками); в оригинале это
// calcTotalPoints()/calcBalance() в config.js. Типы свои, минимальные.

export type BalanceMetric = { id: string; type: string; goal_value: number | null; goal_direction: string | null }
export type BalanceValueRow = { date: string; metric_id: string; value: unknown }

function numeric(metric: BalanceMetric, value: unknown): number | null {
  if (value == null) return null
  if (metric.type === 'sets' && Array.isArray(value)) return (value as { reps?: number }[]).reduce((s, x) => s + (x?.reps || 0), 0)
  return typeof value === 'number' ? value : null
}

export function isDone(metric: BalanceMetric, value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (metric.type === 'boolean') return value === true
  if (metric.type === 'multiselect') return Array.isArray(value) && value.length > 0
  if (metric.type === 'number' || metric.type === 'sets') {
    const n = numeric(metric, value)
    if (n == null) return false
    const goal = metric.goal_value ?? 0
    if (metric.goal_direction === 'at_most') return n > 0 && n < goal
    return n >= goal
  }
  return false
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
  for (const d of Object.keys(byDay)) for (const m of metrics) if (isDone(m, byDay[d][m.id])) daily++
  const total =
    daily +
    doneGoals.reduce((s, g) => s + (g.points ?? 5), 0) +
    masteredSkills.reduce((s, x) => s + (x.points ?? 10), 0) +
    doneBooks.reduce((s, b) => s + (b.points ?? 10), 0)
  const spent = redeemedCosts.reduce<number>((s, c) => s + (c ?? 0), 0)
  return { total, spent, balance: total - spent }
}
