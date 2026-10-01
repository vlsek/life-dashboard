// Раскладка блоков Дашборда: показать/скрыть/переставить. Порт normalizeDashboardLayout() из dashboard.js —
// та же колонка profiles.dashboard_layout (миграция 015) и те же ключи, поэтому раскладка общая с классикой:
// [{"key":"profile","visible":true}, ...], порядок в массиве = порядок на странице.
export const DASHBOARD_BLOCK_KEYS = ['profile', 'charts', 'daily'] as const
export type DashboardBlockKey = (typeof DASHBOARD_BLOCK_KEYS)[number]

export interface LayoutItem {
  key: DashboardBlockKey
  visible: boolean
}

// «daily» = Дневные метрики + Планы (одна дата на оба) — по отдельности не переставляются, как и в классике.
export function defaultLayout(): LayoutItem[] {
  return DASHBOARD_BLOCK_KEYS.map((key) => ({ key, visible: true }))
}

export function normalizeLayout(saved: unknown): LayoutItem[] {
  const layout: LayoutItem[] = []
  const seen = new Set<string>()
  if (Array.isArray(saved)) {
    for (const item of saved) {
      const key = item && (item as { key?: unknown }).key
      if (typeof key === 'string' && (DASHBOARD_BLOCK_KEYS as readonly string[]).includes(key) && !seen.has(key)) {
        layout.push({ key: key as DashboardBlockKey, visible: (item as { visible?: unknown }).visible !== false })
        seen.add(key)
      }
    }
  }
  // блоки, которых нет в сохранённой раскладке (появились уже после настройки) — в конец, видимыми
  for (const key of DASHBOARD_BLOCK_KEYS) {
    if (!seen.has(key)) layout.push({ key, visible: true })
  }
  return layout
}

// Смена мест соседних блоков; за границы списка не выходит. Возвращает новый массив.
export function moveBlock(layout: LayoutItem[], index: number, dir: -1 | 1): LayoutItem[] {
  const j = index + dir
  if (index < 0 || index >= layout.length || j < 0 || j >= layout.length) return layout.map((i) => ({ ...i }))
  const next = layout.map((i) => ({ ...i }))
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

export function toggleBlock(layout: LayoutItem[], index: number): LayoutItem[] {
  return layout.map((i, k) => (k === index ? { ...i, visible: !i.visible } : { ...i }))
}

export function visibleKeys(layout: LayoutItem[]): DashboardBlockKey[] {
  return layout.filter((i) => i.visible).map((i) => i.key)
}
