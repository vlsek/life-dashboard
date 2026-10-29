import { isMetricDone, metricExpectedOn, metricNumericValue } from './metrics'
import type { PlanSnapshotItem } from './planBridge'
import type { Metric, MetricValue } from './types'

// «Осталось на сегодня» (BACKLOG 75.2, срез 1): компактный список невыполненных на день метрик.
// Берём то, что «нужно в этот день по расписанию и ещё не выполнено» (как подсветка `isRemaining`), и отбрасываем то, что не «задача»:
// метрики «не больше N» (at_most) — это лимит, а не дело; «N раз в неделю» и пропущенные дни `metricExpectedOn` уже не считает.
// Порядок: сначала числовые с целью — по близости к закрытию (ближе к цели — выше), потом булевы и остальные в порядке метрик.
export interface RemainingRow {
  id: string
  kind: Metric['type'] | 'plan' // 'plan' — свой пункт плана дня (срез 2)
  name: string
  icon: string | null
  oneTap: boolean // булеву метрику можно закрыть прямо из списка
  progress: number | null // 0..1 — только числовые с положительной целью
  value: number | null
  goal: number | null
  unit: string | null
  planIndex?: number // только у 'plan': позиция пункта в плане дня
  time?: string | null // только у 'plan': «HH:MM»
}

export const PLAN_ROW_PREFIX = 'plan:'

export function remainingToday(
  metrics: readonly Metric[],
  pending: Readonly<Record<string, MetricValue>>,
  dateStr: string,
  plan: readonly PlanSnapshotItem[] = [],
): RemainingRow[] {
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
  // Пункты плана: со временем — раньше всего (по времени), без времени — после булевых метрик
  for (const it of plan) {
    rows.push({ id: PLAN_ROW_PREFIX + it.index, kind: 'plan', name: it.text, icon: null, oneTap: true, progress: null, value: null, goal: null, unit: null, planIndex: it.index, time: it.time })
  }
  // 0 — пункты плана со временем (по времени); 1 — числовые с целью (ближе к закрытию выше); 2 — булевы; 3 — пункты плана без времени; 4 — прочее
  const rank = (r: RemainingRow) => (r.kind === 'plan' ? (r.time ? 0 : 3) : r.progress != null ? 1 : r.oneTap ? 2 : 4)
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const ra = rank(a.r)
      const rb = rank(b.r)
      if (ra !== rb) return ra - rb
      if (ra === 0) return (a.r.time ?? '').localeCompare(b.r.time ?? '') || a.i - b.i
      if (ra === 1) return (b.r.progress ?? 0) - (a.r.progress ?? 0) || a.i - b.i
      return a.i - b.i
    })
    .map((x) => x.r)
}
