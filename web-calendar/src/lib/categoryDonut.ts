// «Диаграммы» в Истории (BACKLOG 656 в): геометрия кольца по категориям — КОПИЯ логики `web-dashboard/src/lib/categoryDonut.ts`
// (donutArcs / arcHue / groupPct), чтобы кольцо в окне сводки дня и в Истории выглядело одинаково. Менять обе стороны вместе.
export interface CategoryGroup {
  key: string
  label: string // '' для служебной группы «Без категории»
  kind: 'category' | 'none'
  done: number
  total: number
}

export interface DonutArc {
  key: string
  hue: number
  startFrac: number
  lenFrac: number
  doneFrac: number
}

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
