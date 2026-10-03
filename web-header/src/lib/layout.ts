// Раскладка блоков Дашборда: показать/скрыть/переставить. Порт normalizeDashboardLayout() из dashboard.js —
// та же колонка profiles.dashboard_layout (миграция 015) и те же ключи, поэтому раскладка общая с классикой:
// [{"key":"profile","visible":true}, ...], порядок в массиве = порядок на странице.
export const DASHBOARD_BLOCK_KEYS = ['profile', 'charts', 'daily', 'widgets'] as const
export type DashboardBlockKey = (typeof DASHBOARD_BLOCK_KEYS)[number]

// Выбранные виджеты блока «Виджеты» (BACKLOG 9, решение владельца 2026-10-03: три виджета, выбор галочками в окне раскладки).
// Хранятся прямо в элементе раскладки `widgets` (profiles.dashboard_layout, миграция не нужна). Сейчас: `savings` — id товара магазина,
// на который копит человек («Коплю на товар»). Классика (заморожена) незнакомые ключи отбрасывает — для неё блока «Виджеты» просто нет.
export interface WidgetsConfig {
  savings?: string
}

export interface LayoutItem {
  key: DashboardBlockKey
  visible: boolean
  widgets?: WidgetsConfig
}

export function widgetsConfig(raw: unknown): WidgetsConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const savings = (raw as { savings?: unknown }).savings
  const cfg: WidgetsConfig = {}
  if (typeof savings === 'string' && savings.length > 0) cfg.savings = savings
  return Object.keys(cfg).length > 0 ? cfg : undefined
}

export function hasWidgets(item: LayoutItem): boolean {
  return !!item.widgets && Object.keys(item.widgets).length > 0
}

// Блок «показан»: включён и (для «Виджетов») выбран хотя бы один виджет — «если ни одного виджета не выбрано, блока нет вообще».
// Тут про выбор; пустой по факту виджет (товар куплен/удалён) гасит блок сам, см. WidgetsSection.vue.
export function isBlockShown(item: LayoutItem): boolean {
  return item.visible && (item.key !== 'widgets' || hasWidgets(item))
}

// Новая раскладка с включённым/выключенным виджетом «Коплю на товар» (itemId = null — выключить). Остальное не меняется.
export function withSavingsWidget(layout: LayoutItem[], itemId: string | null): LayoutItem[] {
  return layout.map((it) => {
    if (it.key !== 'widgets') return { ...it, ...(it.widgets ? { widgets: { ...it.widgets } } : {}) }
    const next: WidgetsConfig = { ...(it.widgets || {}) }
    if (itemId) next.savings = itemId
    else delete next.savings
    const { widgets: _drop, ...rest } = it
    void _drop
    return Object.keys(next).length > 0 ? { ...rest, widgets: next } : { ...rest }
  })
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
        const entry: LayoutItem = { key: key as DashboardBlockKey, visible: (item as { visible?: unknown }).visible !== false }
        const widgets = key === 'widgets' ? widgetsConfig((item as { widgets?: unknown }).widgets) : undefined
        if (widgets) entry.widgets = widgets
        layout.push(entry)
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
