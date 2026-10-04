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

// Журнал планового числа подходов: только корректные записи, по возрастанию дат (из БД может прийти что угодно). Флаг frac — только строго true.
export function plannedSetsLog(metric: { planned_sets_log?: PlannedSetsEntry[] | null }): PlannedSetsEntry[] {
  const raw = metric?.planned_sets_log
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e) => e && typeof e.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.from))
    .map((e): PlannedSetsEntry => ({ from: e.from, n: e.n == null ? null : Math.floor(Number(e.n)), ...(e.frac === true ? { frac: true } : {}) }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
}

type PlanMetric = { type: string; goal_direction?: string | null; planned_sets_log?: PlannedSetsEntry[] | null }

// Запись журнала, действовавшая в ДЕНЬ dateStr (последняя с from <= dateStr; без dateStr — последняя), или null; для не-sets и «не более» — null.
function plannedSetsEntryFor(metric: PlanMetric, dateStr?: string): PlannedSetsEntry | null {
  if (metric.type !== 'sets' || metric.goal_direction === 'at_most') return null
  let entry: PlannedSetsEntry | null = null
  for (const e of plannedSetsLog(metric)) {
    if (dateStr && e.from > dateStr) break
    entry = e
  }
  return entry
}

const validN = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n >= 1

// Плановое число подходов на ДЕНЬ dateStr или null, если правило в этот день не действовало: не тип sets, направление «не более»,
// до первой записи журнала либо параметр снят. Без dateStr — действующее сейчас значение. (Копия из web-dashboard/src/lib/metrics.ts.)
export function plannedSetsFor(metric: PlanMetric, dateStr?: string): number | null {
  const e = plannedSetsEntryFor(metric, dateStr)
  return e && validN(e.n) ? e.n : null
}

// То же число, но ТОЛЬКО если запись журнала в силе помечена frac: дробные баллы действуют по записям с флагом (миграция 045).
export function plannedSetsFracFor(metric: PlanMetric, dateStr?: string): number | null {
  const e = plannedSetsEntryFor(metric, dateStr)
  return e && e.frac === true && validN(e.n) ? e.n : null
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

// БАЛЛЫ метрики за день в ДЕСЯТЫХ долях (целое; 10 = 1 балл). Выполнена — 10; не выполнена — только у метрики-подходов с планом N и записью
// журнала с frac на эту дату: round(10·подходов/N) десятых, «половина вверх» целочисленно (20·подходов + N) / (2·N), потолок 9. Иначе 0.
// ТОЧНАЯ КОПИЯ web-dashboard/src/lib/metrics.ts и SQL metric_partial_points (миграция 045). Баланс не должен расходиться между страницами.
export function metricDayPointsTenths(metric: Metric, value: MetricValue, dateStr?: string): number {
  if (isMetricDone(metric, value, dateStr)) return 10
  const n = plannedSetsFracFor(metric, dateStr)
  if (n == null) return 0
  return Math.min(9, Math.floor((20 * setsCount(value) + n) / (2 * n)))
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

  // Считаем в десятых долях целыми числами и делим один раз в конце: без хвоста плавающей точки (12.3, а не 12.299999999999999)
  let dailyTenths = 0
  for (const dateStr of Object.keys(byDay)) {
    for (const m of activeMetrics) dailyTenths += metricDayPointsTenths(m, byDay[dateStr][m.id], dateStr)
  }

  const goalPoints = doneGoals.reduce((sum, g) => sum + (g.points ?? 5), 0)
  const skillPoints = masteredSkills.reduce((sum, s) => sum + (s.points ?? 10), 0)
  const bookPoints = doneBooks.reduce((sum, b) => sum + (b.points ?? 10), 0)

  return (dailyTenths + Math.round((goalPoints + skillPoints + bookPoints) * 10)) / 10
}

// Портировано из calcBalance() в config.js: total (см. выше) минус стоимость уже купленных
// товаров магазина.
export function calcBalanceFromTotals(total: number, redeemedItemCosts: number[]): { total: number; spent: number; balance: number } {
  const spent = redeemedItemCosts.reduce((sum, c) => sum + (c ?? 0), 0)
  return { total, spent, balance: Math.round((total - spent) * 10) / 10 }
}
