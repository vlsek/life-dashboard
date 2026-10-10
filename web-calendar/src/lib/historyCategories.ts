import type { HistoryContext } from './historyStats'
import { isMetricDone, metricCountsInDay, metricSchedule } from './historyMetrics'
import { addDaysIso, fmtDate } from './date'
import type { CategoryGroup } from './categoryDonut'

// Доли категорий метрик за месяц (BACKLOG 656 в): для каждого дня месяца с данными (от первой записи до сегодня) каждая ежедневная
// метрика, которая в этот день «в счёте» (расписание), даёт +1 к total своей категории и +1 к done, если выполнена. Метрики «не чаще N»
// (at_most) — не дневной пункт, как в dayStats, и сюда не попадают. Метрики без категории — группа «Без категории» (в конце).
// month — 0..11. categories — id → название (пусто — все метрики в «Без категории»).
export function monthCategoryGroups(ctx: HistoryContext, categories: Record<string, string>, year: number, month: number): CategoryGroup[] {
  if (!ctx.firstDate) return []
  const map = new Map<string, CategoryGroup>()
  const first = fmtDate(new Date(year, month, 1))
  const days = new Date(year, month + 1, 0).getDate()
  for (let i = 0; i < days; i++) {
    const d = addDaysIso(first, i)
    if (d < ctx.firstDate || d > ctx.today) continue
    const vals = ctx.byDate?.[d] || {}
    for (const m of ctx.metrics ?? []) {
      if (metricSchedule(m)?.type === 'at_most') continue
      const done = isMetricDone(m, vals[m.id], d)
      if (!metricCountsInDay(m, d, done)) continue
      const label = m.category_id ? categories[m.category_id] : undefined
      const kind: CategoryGroup['kind'] = label ? 'category' : 'none'
      const key = kind === 'category' ? `c:${label}` : 'none'
      const g = map.get(key) ?? { key, label: label ?? '', kind, done: 0, total: 0 }
      g.total += 1
      if (done) g.done += 1
      map.set(key, g)
    }
  }
  const order = { category: 0, none: 1 }
  return [...map.values()].sort((a, b) => order[a.kind] - order[b.kind] || b.total - a.total || a.label.localeCompare(b.label))
}
