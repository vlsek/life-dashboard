import { isMetricDone, metricExpectedOn, metricNumericValue } from './metrics'
import type { Metric, MetricValue } from './types'

// «Осталось на сегодня» (BACKLOG 75.2, срез 1): компактный список невыполненных на день метрик.
// Берём то, что «нужно в этот день по расписанию и ещё не выполнено» (как подсветка `isRemaining`), и отбрасываем то, что не «задача»:
// метрики «не больше N» (at_most) — это лимит, а не дело; «N раз в неделю» и пропущенные дни `metricExpectedOn` уже не считает.
// Порядок: сначала числовые с целью — по близости к закрытию (ближе к цели — выше), потом булевы и остальные в порядке метрик.
export interface RemainingRow {
  id: string
  kind: Metric['type']
  name: string
  icon: string | null
  oneTap: boolean // булеву метрику можно закрыть прямо из списка
  progress: number | null // 0..1 — только числовые с положительной целью
  value: number | null
  goal: number | null
  unit: string | null
}

export function remainingToday(metrics: readonly Metric[], pending: Readonly<Record<string, MetricValue>>, dateStr: string): RemainingRow[] {
  const rows: RemainingRow[] = []
  for (const m of metrics) {
    if (!metricExpectedOn(m, dateStr)) continue
    if (isMetricDone(m, pending[m.id], dateStr)) continue
    if ((m.type === 'number' || m.type === 'sets') && m.goal_direction === 'at_most') continue
    const numeric = m.type === 'number' || m.type === 'sets' ? metricNumericValue(m, pending[m.id]) : null
    const goal = m.goal_value != null && m.goal_value > 0 ? m.goal_value : null
    const progress = numeric != null && goal != null ? Math.max(0, Math.min(1, numeric / goal)) : null
    rows.push({
      id: m.id,
      kind: m.type,
      name: m.name,
      icon: m.icon,
      oneTap: m.type === 'boolean',
      progress: m.type === 'number' || m.type === 'sets' ? (goal != null ? (progress ?? 0) : null) : null,
      value: numeric,
      goal,
      unit: m.unit,
    })
  }
  const rank = (r: RemainingRow) => (r.progress != null ? 0 : r.oneTap ? 1 : 2)
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => rank(a.r) - rank(b.r) || (rank(a.r) === 0 ? (b.r.progress ?? 0) - (a.r.progress ?? 0) : 0) || a.i - b.i)
    .map((x) => x.r)
}
