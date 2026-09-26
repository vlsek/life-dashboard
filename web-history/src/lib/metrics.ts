import type { Metric, MetricSchedule, MetricValue, SetEntry } from './types'
import { weekdayOf } from './date'

// Портировано 1:1 из config.js / dashboard.js — те же условия и та же семантика,
// чтобы проценты на этой странице всегда совпадали с остальным сайтом.

export function metricSchedule(m: Pick<Metric, 'schedule'> | undefined | null): MetricSchedule | null {
  const s = m?.schedule
  if (!s || typeof s !== 'object') return null
  if (s.type === 'days' && Array.isArray(s.days) && s.days.length > 0 && s.days.length < 7) {
    return { type: 'days', days: s.days }
  }
  if (s.type === 'weekly' && (s.min ?? 0) >= 1) {
    return { type: 'weekly', min: Math.min(7, Math.floor(s.min!)) }
  }
  if (s.type === 'at_most' && (s.max ?? -1) >= 0) {
    return { type: 'at_most', max: Math.min(7, Math.floor(s.max!)) }
  }
  return null
}

export function metricExpectedOn(m: Metric, dateStr: string): boolean {
  const s = metricSchedule(m)
  if (!s) return true
  if (s.type === 'days') return s.days!.includes(weekdayOf(dateStr))
  return false
}

// Учитывать ли метрику в "проценте дня": обязательные на этот день — да; сделанные вне
// расписания и "N раз в неделю" — только если сделаны (это бонус, а не штраф за отдых)
export function metricCountsInDay(m: Metric, dateStr: string, isDone: boolean): boolean {
  return metricExpectedOn(m, dateStr) || isDone
}

export function metricNumericValue(metric: Pick<Metric, 'type'>, value: MetricValue): number | null {
  if (value == null) return null
  if (metric.type === 'sets' && Array.isArray(value)) {
    return (value as SetEntry[]).reduce((sum, s) => sum + (s?.reps || 0), 0)
  }
  return typeof value === 'number' ? value : null
}

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

export const BONUS_PCT_PER_ITEM = 20
