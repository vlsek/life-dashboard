import type { CategoryLeaderboardRow, CategoryMode, DailyValueRaw, MetricCategory, NumberMetric, Scope } from './types'
import { filterPointsByRange, type PeriodRange } from './chart'

// Портировано из loadCategoryLeaderboard() в community.js: видно тех, кто не спрятался
// (или это ты) И у кого есть хоть какая-то активность в категории (или это ты);
// опционально — только друзья; сортировка по выбранному режиму, по убыванию.
export function categoryRows(rows: CategoryLeaderboardRow[], myUserId: string, scope: Scope, friendIds: Set<string>, mode: CategoryMode): CategoryLeaderboardRow[] {
  let out = rows.filter((r) => (r.leaderboard_visible !== false || r.user_id === myUserId) && (r.category_points > 0 || r.total_value > 0 || r.user_id === myUserId))
  if (scope === 'friends') out = out.filter((r) => r.user_id === myUserId || friendIds.has(r.user_id))
  const sortKey = mode === 'streak' ? 'category_streak' : mode === 'points' ? 'category_points' : 'total_value'
  return out.slice().sort((a, b) => b[sortKey] - a[sortKey])
}

// Портировано из renderCategoryChart(): сумма значений всех привязанных метрик по дням
// (parseFloat, как в оригинале — значение в базе может лежать строкой), потом фильтр по
// периоду личного графика, потом сортировка по дате.
export function categoryChartPoints(values: DailyValueRaw[], range: PeriodRange, from: string | null, to: string | null, today: Date = new Date()) {
  const byDay: Record<string, number> = {}
  for (const v of values) byDay[v.date] = (byDay[v.date] ?? 0) + (parseFloat(String(v.value)) || 0)
  const points = Object.keys(byDay)
    .sort()
    .map((d) => ({ date: d, y: byDay[d] as number | null }))
  return filterPointsByRange(points, range, from, to, today)
}

// Если у привязанных метрик есть цель — линией-ориентиром предлагается сумма этих целей.
export function defaultGoalSum(metrics: Pick<NumberMetric, 'goal_value'>[]): number | null {
  return metrics.reduce((sum, m) => sum + (m.goal_value || 0), 0) || null
}

export function categoryLabel(c: Pick<MetricCategory, 'label_ru' | 'label_en'>): string {
  return `${c.label_ru} / ${c.label_en}`
}
