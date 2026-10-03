import type { DailyValue, GoalRow, SkillRow, BookRow, Metric, MetricValue, PlannedSetsEntry, SetEntry } from './types'

// Портировано 1:1 из metricNumericValue() в config.js.
export function metricNumericValue(metric: Pick<Metric, 'type'>, value: MetricValue): number | null {
  if (value == null) return null
  if (metric.type === 'sets' && Array.isArray(value)) {
    return (value as SetEntry[]).reduce((sum, s) => sum + (s?.reps || 0), 0)
  }
  return typeof value === 'number' ? value : null
}

// Портировано из isMetricDone() в config.js + правило «N подходов в день» (миграция 041).
// Сколько подходов реально сделано: запись с повторами > 0 или с заполненным временем (пустые заготовки не считаем).
export function setsCount(value: MetricValue): number {
  if (!Array.isArray(value)) return 0
  return (value as { reps?: number; time?: string | null }[]).filter((s) => (s?.reps || 0) > 0 || !!s?.time).length
}

// Журнал планового числа подходов: только корректные записи, по возрастанию дат (из БД может прийти что угодно).
export function plannedSetsLog(metric: { planned_sets_log?: PlannedSetsEntry[] | null }): PlannedSetsEntry[] {
  const raw = metric?.planned_sets_log
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e) => e && typeof e.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.from))
    .map((e) => ({ from: e.from, n: e.n == null ? null : Math.floor(Number(e.n)) }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
}

// Плановое число подходов на ДЕНЬ dateStr или null, если правило в этот день не действовало: не тип sets, направление «не более»,
// до первой записи журнала либо параметр снят. Без dateStr — действующее сейчас значение. (Копия из web-dashboard/src/lib/metrics.ts.)
export function plannedSetsFor(
  metric: { type: string; goal_direction?: string | null; planned_sets_log?: PlannedSetsEntry[] | null },
  dateStr?: string,
): number | null {
  if (metric.type !== 'sets' || metric.goal_direction === 'at_most') return null
  let n: number | null = null
  for (const e of plannedSetsLog(metric)) {
    if (dateStr && e.from > dateStr) break
    n = e.n
  }
  return n != null && Number.isFinite(n) && n >= 1 ? n : null
}

// dateStr — день, к которому относится значение. При подсчёте ПРОШЛЫХ дней (серии, неделя, История, баланс) обязательно передавать:
// иначе правило «N подходов» задним числом изменит историю. Без dateStr — как «сегодня».
export function isMetricDone(metric: Metric, value: MetricValue, dateStr?: string): boolean {
  if (value === null || value === undefined) return false
  if (metric.type === 'boolean') return value === true
  if (metric.type === 'multiselect') return Array.isArray(value) && (value as string[]).length > 0
  if (metric.type === 'number' || metric.type === 'sets') {
    const numeric = metricNumericValue(metric, value)
    if (numeric == null) return false
    const goal = metric.goal_value ?? 0
    if (metric.goal_direction === 'at_most') return numeric > 0 && numeric < goal
    const planned = plannedSetsFor(metric, dateStr)
    // «Не меньше N подходов» (+ общий объём, если задан): оба условия сразу
    if (planned != null) return setsCount(value) >= planned && numeric >= goal
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
      if (isMetricDone(m, byDay[dateStr][m.id], dateStr)) dailyPoints++
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
