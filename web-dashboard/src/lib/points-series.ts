import { metricDayPointsTenths } from './metrics'
import type { Metric, DailyValueRow } from './types'
import type { ChartPoint } from './chart'

// Портировано из куска series["points"] в buildAvailableSeries() (dashboard.js): для
// каждого дня, встречающегося в daily_values, считает число выполненных метрик. Это
// единственная серия из buildAvailableSeries(), не зависящая от body_parameters (Профиль,
// ещё не перенесённый блок) — остальные серии (параметры тела, отдельные метрики
// number/sets с целевой линией, редактирование значений прямо из графика) заведены как
// TODO следующей итерации в ChartsSection.vue.
export function pointsPerDaySeries(metrics: Metric[], values: DailyValueRow[]): ChartPoint[] {
  const byDay: Record<string, Record<string, DailyValueRow['value']>> = {}
  for (const v of values) {
    byDay[v.date] ||= {}
    byDay[v.date][v.metric_id] = v.value
  }
  const days = Object.keys(byDay).sort()
  return days.map((d) => {
    let tenths = 0 // десятые доли баллов (дробные за подходы — миграция 045); делим один раз, без хвоста плавающей точки
    for (const m of metrics) tenths += metricDayPointsTenths(m, byDay[d][m.id], d)
    return { date: d, y: tenths / 10 }
  })
}
