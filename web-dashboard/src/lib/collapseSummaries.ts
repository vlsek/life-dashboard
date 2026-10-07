import { t } from './i18n'
import { isPlannedItemDone, type GoalLite, type PlannedItem } from './progress'

// Строки итога для вида сворачивания «карточка со сводкой» (BACKLOG 498 срез 3). Чистая логика: пустая строка = «итога нет» (плашка не рисуется).
const fill = (tpl: string, vars: Record<string, string | number>): string => tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''))

// Планы дня: сколько пунктов выполнено. Удалённая цель в счёт не идёт (как в «Прогрессе дня»).
export function plannedCounts(planned: readonly PlannedItem[], goals: readonly GoalLite[]): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const item of planned) {
    const d = isPlannedItemDone(item, goals as GoalLite[])
    if (d === undefined) continue
    total++
    if (d) done++
  }
  return { done, total }
}

export function plannedSummary(planned: readonly PlannedItem[], goals: readonly GoalLite[]): string {
  const { done, total } = plannedCounts(planned, goals)
  return total > 0 ? fill(t('dash_collapse_done_of'), { done, total }) : ''
}

// Метрики за день: те же «баллы за день», что показаны внутри блока.
export function pointsSummary(points: number, total: number): string {
  return total > 0 ? fill(t('dash_collapse_points'), { points, total }) : ''
}

export function widgetsSummary(count: number): string {
  return count > 0 ? fill(t('dash_collapse_widgets'), { n: count }) : ''
}
