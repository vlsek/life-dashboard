import type { HabitScore } from './habitScore'
import type { StreakItem } from './streaks'

// BACKLOG 18.5: серия по каждой метрике отдельно, для показа рядом с её названием в «Дневных метриках».
// Берётся из уже посчитанного списка стриков (useDashboard → computeStreakItemsPure): метрики с выключенным
// «считать стрик» (миграция 031) и метрики без серии (0 дней) в нём просто отсутствуют — огонька у них не будет.
export interface MetricStreakInfo {
  streak: number
  unit?: 'w'
  todayCounted: boolean
  score?: number // «сила привычки» 0–100 (BACKLOG 75.1); есть и у метрик без серии — streak тогда 0 и огонёк не рисуется
}

export function metricStreakMap(items: StreakItem[], scores: Readonly<Record<string, HabitScore>> = {}): Record<string, MetricStreakInfo> {
  const out: Record<string, MetricStreakInfo> = {}
  for (const it of items) {
    if (it.kind !== 'metric' || !it.metric || it.streak < 1) continue
    out[it.metric.id] = { streak: it.streak, unit: it.unit, todayCounted: it.todayCounted }
  }
  // сила привычки (75.1): рядом с огоньком; у метрики без серии (после пропуска оценка ещё высокая — в этом и смысл) — одна, без огонька
  for (const [id, sc] of Object.entries(scores)) {
    if (out[id]) out[id].score = sc.score
    else out[id] = { streak: 0, todayCounted: true, score: sc.score }
  }
  return out
}
