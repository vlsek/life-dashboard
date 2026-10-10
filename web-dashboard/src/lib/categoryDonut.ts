import type { SummaryItem } from './progressSummary'

// «Прогресс дня по категориям» (BACKLOG 656 а): кольцо, где у каждой категории метрик своя дуга. Длина дуги — доля категории
// в общем весе дня, закрашенная часть дуги — сколько в ней выполнено. Метрики без категории — группа «Без категории»,
// планы дня — группа «Планы». Чистые функции: без DOM, без i18n (названия групп приходят снаружи), поэтому легко тестируются.
export interface CategoryGroup {
  key: string
  label: string // '' для служебных групп — подпись подставляет компонент
  kind: 'category' | 'none' | 'plans'
  done: number
  total: number
}

export interface DonutArc {
  key: string
  hue: number
  startFrac: number // где дуга начинается на окружности, доля 0..1
  lenFrac: number // длина всей дуги, доля 0..1 (с зазором между соседями)
  doneFrac: number // закрашенная часть дуги, доля 0..1 окружности
}

export function categoryGroups(items: SummaryItem[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>()
  for (const i of items) {
    if (i.weight <= 0) continue
    const kind: CategoryGroup['kind'] = i.kind === 'plan' ? 'plans' : i.category ? 'category' : 'none'
    const key = kind === 'category' ? `c:${i.category}` : kind
    const g = map.get(key) ?? { key, label: kind === 'category' ? (i.category as string) : '', kind, done: 0, total: 0 }
    g.done += Math.min(i.doneWeight, i.weight)
    g.total += i.weight
    map.set(key, g)
  }
  const order = { category: 0, none: 1, plans: 2 }
  return [...map.values()].sort((a, b) => order[a.kind] - order[b.kind] || b.total - a.total || a.label.localeCompare(b.label))
}

// Оттенок дуги по номеру: золотой угол даёт заметно разные цвета даже при 8–10 категориях.
export const arcHue = (index: number): number => Math.round((index * 137.5 + 205) % 360)

export function donutArcs(groups: CategoryGroup[], gapFrac = 0.012): DonutArc[] {
  const total = groups.reduce((s, g) => s + g.total, 0)
  if (total <= 0) return []
  const gap = groups.length > 1 ? gapFrac : 0
  let start = 0
  return groups.map((g, idx) => {
    const share = g.total / total
    const len = Math.max(0, share - gap)
    const arc: DonutArc = { key: g.key, hue: arcHue(idx), startFrac: start + gap / 2, lenFrac: len, doneFrac: g.total > 0 ? len * (g.done / g.total) : 0 }
    start += share
    return arc
  })
}

export const groupPct = (g: CategoryGroup): number => (g.total > 0 ? Math.round((g.done / g.total) * 100) : 0)
