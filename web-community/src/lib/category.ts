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

// ---- Срез 2 BACKLOG 44.13: одно главное значение вместо четырёх колонок, запоминание категории, «ваше место» ----

export const CATEGORY_STORAGE_KEY = 'community_category'

// Главное число строки — то, по чему идёт сортировка выбранного режима
export function modeValue(row: Pick<CategoryLeaderboardRow, 'total_value' | 'category_points' | 'category_streak'>, mode: CategoryMode): number {
  return mode === 'streak' ? row.category_streak : mode === 'points' ? row.category_points : row.total_value
}

// «Вы на N месте из M» по уже отфильтрованным и отсортированным строкам; null, если вас в списке нет
export function myCategoryPlace(rows: Pick<CategoryLeaderboardRow, 'user_id'>[], myUserId: string): { rank: number; total: number } | null {
  const i = rows.findIndex((r) => r.user_id === myUserId)
  return i < 0 ? null : { rank: i + 1, total: rows.length }
}

// Какая категория открыта сразу: запомненная, если она ещё есть в списке, иначе первая; пустой список — ''.
export function initialCategoryKey(categories: Pick<MetricCategory, 'key'>[], stored: string | null): string {
  if (stored && categories.some((c) => c.key === stored)) return stored
  return categories[0]?.key ?? ''
}

export function loadCategoryKey(): string | null {
  try {
    return localStorage.getItem(CATEGORY_STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveCategoryKey(key: string): void {
  try {
    localStorage.setItem(CATEGORY_STORAGE_KEY, key)
  } catch {
    /* хранилище недоступно — категория просто не запомнится */
  }
}
