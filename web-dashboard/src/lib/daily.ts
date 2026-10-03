import { addDaysIso } from './date'
import { isMetricDone, metricExpectedOn, metricNumericValue } from './metrics'
import type { Metric, MetricValue } from './types'

// Всё здесь — чистые функции без сети/DOM: то, что в renderDay() было размазано по замыканиям
// вокруг `pending`. Покрыто тестами в daily.test.ts, чтобы поведение не разъехалось с оригиналом.

export type PendingValues = Record<string, MetricValue>

// Начальное значение поля для метрики: сохранённое — как есть; иначе пустое по типу. Для number
// нарочно undefined (а не 0): "0" остаётся плейсхолдером, и не нужно стирать его перед вводом.
export function initialPending(metrics: Metric[], valueByMetric: Record<string, MetricValue>): PendingValues {
  const out: PendingValues = {}
  for (const m of metrics) {
    const saved = valueByMetric[m.id]
    if (saved !== undefined && saved !== null) {
      out[m.id] = saved
    } else if (m.type === 'multiselect' || m.type === 'sets') {
      out[m.id] = []
    } else if (m.type === 'boolean') {
      out[m.id] = false
    } else {
      out[m.id] = undefined
    }
  }
  return out
}

// Разбор поля number: пусто → undefined ("не вводили"), мусор → 0, иначе число (в т.ч. дробное).
export function parseNumberInput(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

// Режим "прибавлять": новое значение = текущий итог + введённая дельта. Пустая/нулевая дельта —
// не изменение (null), чтобы не писать в базу лишний раз.
export function applyDelta(current: MetricValue, deltaRaw: string): number | null {
  const delta = parseFloat(deltaRaw)
  if (!delta) return null
  const base = typeof current === 'number' ? current : 0
  return base + delta
}

// Ручная правка итога (карандаш рядом с "Итого сегодня"). null — отмена или не число.
export function parseFixedTotal(raw: string | null): number | null {
  if (raw === null) return null
  const n = parseFloat(raw)
  return Number.isNaN(n) ? null : n
}

// Переключение варианта в multiselect: есть — убрать, нет — добавить в конец.
export function toggleOption(selected: string[], key: string): string[] {
  return selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
}

// Что писать в daily_values при "Сохранить день": number без значения сохраняется как 0.
export function valueToSave(m: Metric, pending: PendingValues): MetricValue {
  return m.type === 'number' ? (pending[m.id] ?? 0) : pending[m.id]
}

// Подсветка "ещё осталось сделать": метрика нужна в этот день по расписанию и не выполнена.
export function isRemaining(m: Metric, dateStr: string, value: MetricValue): boolean {
  return metricExpectedOn(m, dateStr) && !isMetricDone(m, value, dateStr)
}

// "Баллы за день": сколько метрик выполнено из общего числа (считаются все активные метрики).
export function dayScore(metrics: Metric[], pending: PendingValues, dateStr?: string): { points: number; total: number } {
  let points = 0
  for (const m of metrics) if (isMetricDone(m, pending[m.id], dateStr)) points++
  return { points, total: metrics.length }
}

// Число для точечного обновления графика после автосохранения.
export function chartValue(m: Metric, value: MetricValue): number | null {
  return metricNumericValue(m, value)
}

export function shiftDate(dateStr: string, deltaDays: number): string {
  return addDaysIso(dateStr, deltaDays)
}

export function dayLabel(dateStr: string, lang: 'en' | 'ru'): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
