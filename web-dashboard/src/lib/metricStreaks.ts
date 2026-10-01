import type { StreakItem } from './streaks'

// BACKLOG 18.5: серия по каждой метрике отдельно, для показа рядом с её названием в «Дневных метриках».
// Берётся из уже посчитанного списка стриков (useDashboard → computeStreakItemsPure): метрики с выключенным
// «считать стрик» (миграция 031) и метрики без серии (0 дней) в нём просто отсутствуют — огонька у них не будет.
export interface MetricStreakInfo {
  streak: number
  unit?: 'w'
  todayCounted: boolean
}

export function metricStreakMap(items: StreakItem[]): Record<string, MetricStreakInfo> {
  const out: Record<string, MetricStreakInfo> = {}
  for (const it of items) {
    if (it.kind !== 'metric' || !it.metric || it.streak < 1) continue
    out[it.metric.id] = { streak: it.streak, unit: it.unit, todayCounted: it.todayCounted }
  }
  return out
}
