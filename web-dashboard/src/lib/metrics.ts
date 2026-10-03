import { weekdayOf } from './date'
import type { Metric, MetricValue, PlannedSetsEntry, Schedule } from './types'

// Числовое значение метрики независимо от формата хранения — обычное число, или сумма
// reps по всем подходам (для типа "sets"). Совпадает по смыслу с SQL-функцией
// metric_numeric_value() в migrations/018 — держать логику одинаковой на клиенте и сервере.
export function metricNumericValue(metric: Metric, value: MetricValue): number | null {
  if (value == null) return null
  if (metric.type === 'sets' && Array.isArray(value)) {
    return (value as { reps?: number }[]).reduce((sum, s) => sum + (s?.reps || 0), 0)
  }
  return typeof value === 'number' ? value : null
}

// Сколько подходов реально сделано: запись с повторами > 0 или с заполненным временем (пустые заготовки не считаем).
export function setsCount(value: MetricValue): number {
  if (!Array.isArray(value)) return 0
  return (value as { reps?: number; time?: string }[]).filter((s) => (s?.reps || 0) > 0 || !!s?.time).length
}

// Журнал планового числа подходов: только корректные записи, по возрастанию дат (из БД может прийти что угодно).
export function plannedSetsLog(metric: Pick<Metric, 'planned_sets_log'>): PlannedSetsEntry[] {
  const raw = metric?.planned_sets_log
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e) => e && typeof e.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.from))
    .map((e) => ({ from: e.from, n: e.n == null ? null : Math.floor(Number(e.n)) }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
}

// Действующее сейчас значение из журнала (для формы), независимо от типа метрики; null — не задано.
export function currentPlannedSets(metric: Pick<Metric, 'planned_sets_log'>): number | null {
  const log = plannedSetsLog(metric)
  const n = log.length ? log[log.length - 1].n : null
  return n != null && Number.isFinite(n) && n >= 1 ? n : null
}

// Плановое число подходов на ДЕНЬ dateStr или null, если правило в этот день не действовало: не тип sets, направление
// «не более» (там смысл другой), до первой записи журнала либо параметр снят. Без dateStr — действующее сейчас значение.
export function plannedSetsFor(metric: Pick<Metric, 'type' | 'goal_direction' | 'planned_sets_log'>, dateStr?: string): number | null {
  if (metric.type !== 'sets' || metric.goal_direction === 'at_most') return null
  const log = plannedSetsLog(metric)
  let n: number | null = null
  for (const e of log) {
    if (dateStr && e.from > dateStr) break
    n = e.n
  }
  return n != null && Number.isFinite(n) && n >= 1 ? n : null
}

// dateStr — день, к которому относится значение. Для сегодняшнего/текущего значения можно не передавать; при подсчёте
// ПРОШЛЫХ дней (серии, неделя, график) обязательно передавать — иначе правило «N подходов» задним числом изменит историю.
export function isMetricDone(metric: Metric, value: MetricValue, dateStr?: string): boolean {
  if (value === null || value === undefined) return false
  if (metric.type === 'boolean') return value === true
  if (metric.type === 'multiselect') return Array.isArray(value) && value.length > 0
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

// Расписание метрики (см. migrations/021) — на входе то, что реально лежит в БД (может быть
// "грязным"/устаревшим форматом), на выходе — нормализованная форма или null ("каждый день").
export function metricSchedule(m: Pick<Metric, 'schedule'>): Schedule {
  const s = m?.schedule as any
  if (!s || typeof s !== 'object') return null
  if (s.type === 'days' && Array.isArray(s.days) && s.days.length > 0 && s.days.length < 7) {
    return { type: 'days', days: s.days }
  }
  if (s.type === 'weekly' && s.min >= 1) return { type: 'weekly', min: Math.min(7, Math.floor(s.min)) }
  if (s.type === 'at_most' && s.max >= 0) return { type: 'at_most', max: Math.min(7, Math.floor(s.max)) }
  return null
}

// Нужно ли выполнять метрику именно в этот день (для weekly/at_most — нет, не привязаны к дню)
export function metricExpectedOn(m: Pick<Metric, 'schedule'>, dateStr: string): boolean {
  const s = metricSchedule(m)
  if (!s) return true
  if (s.type === 'days') return s.days.includes(weekdayOf(dateStr))
  return false
}

// Учитывать ли метрику в "проценте дня": обязательные на этот день — да; сделанные вне
// расписания и "N раз в неделю" — только если сделаны (это бонус, а не штраф за отдых)
export function metricCountsInDay(m: Pick<Metric, 'schedule'>, dateStr: string, isDone: boolean): boolean {
  return metricExpectedOn(m, dateStr) || isDone
}
