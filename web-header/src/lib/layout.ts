// Раскладка блоков Дашборда: показать/скрыть/переставить. Порт normalizeDashboardLayout() из dashboard.js —
// та же колонка profiles.dashboard_layout (миграция 015) и те же ключи, поэтому раскладка общая с классикой:
// [{"key":"profile","visible":true}, ...], порядок в массиве = порядок на странице.
export const DASHBOARD_BLOCK_KEYS = ['profile', 'charts', 'daily', 'widgets'] as const
export type DashboardBlockKey = (typeof DASHBOARD_BLOCK_KEYS)[number]

// Выбранные виджеты блока «Виджеты» (BACKLOG 388, решение владельца 2026-10-03: три виджета, выбор галочками в окне раскладки).
// Хранятся прямо в элементе раскладки `widgets` в поле `config` (profiles.dashboard_layout, миграция не нужна):
// `skills` — id навыков виджета «Навыки», `savings` — id товара магазина виджета «Коплю на товар», `languages` — набор слов виджета
// «Изучение языков»: код языка словаря ('en', 'de', …) или 'all' (все языки). Классика (заморожена) незнакомые
// ключи отбрасывает — для неё блока «Виджеты» просто нет. Копия этого файла лежит в web-header/ — менять ВМЕСТЕ.
export interface WidgetsConfig {
  skills?: string[]
  savings?: string
  languages?: string
  calendar?: boolean // виджет «Календарь» (BACKLOG 940, часть 2): месяц с отметками планов и сроков целей
}

export interface LayoutItem {
  key: DashboardBlockKey
  visible: boolean
  config?: WidgetsConfig
}

export const MAX_WIDGET_SKILLS = 12

export function widgetsConfig(raw: unknown): WidgetsConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const { skills, savings, languages, calendar } = raw as { skills?: unknown; savings?: unknown; languages?: unknown; calendar?: unknown }
  const cfg: WidgetsConfig = {}
  if (Array.isArray(skills)) {
    const ids = [...new Set(skills.filter((x): x is string => typeof x === 'string' && x.length > 0))].slice(0, MAX_WIDGET_SKILLS)
    if (ids.length > 0) cfg.skills = ids
  }
  if (typeof savings === 'string' && savings.length > 0) cfg.savings = savings
  if (typeof languages === 'string' && languages.length > 0 && languages.length <= 12) cfg.languages = languages
  if (calendar === true) cfg.calendar = true
  return Object.keys(cfg).length > 0 ? cfg : undefined
}

export function hasWidgets(item: LayoutItem): boolean {
  return !!item.config && Object.keys(item.config).length > 0
}

// Блок «показан»: включён и (для «Виджетов») выбран хотя бы один виджет — «если ни одного виджета не выбрано, блока нет вообще».
// Тут про выбор; пустой по факту виджет (товар куплен/удалён) гасит блок сам, см. WidgetsSection.vue.
export function isBlockShown(item: LayoutItem): boolean {
  return item.visible && (item.key !== 'widgets' || hasWidgets(item))
}

// Новая раскладка с изменённым выбором виджетов: patch.skills = [] / patch.savings = null — выключить виджет. Остальное не меняется.
// Когда выбран хотя бы один виджет, блок «Виджеты» включается (иначе выбор в окне раскладки ничего бы не показал).
export function withWidgetConfig(layout: LayoutItem[], patch: { skills?: string[]; savings?: string | null; languages?: string | null; calendar?: boolean }): LayoutItem[] {
  return layout.map((it) => {
    const copy: LayoutItem = { ...it }
    if (it.config) copy.config = { ...it.config, ...(it.config.skills ? { skills: [...it.config.skills] } : {}) }
    if (it.key !== 'widgets') return copy
    const next: WidgetsConfig = { ...(copy.config || {}) }
    if (patch.skills !== undefined) {
      if (patch.skills.length > 0) next.skills = [...new Set(patch.skills)].slice(0, MAX_WIDGET_SKILLS)
      else delete next.skills
    }
    if (patch.savings !== undefined) {
      if (patch.savings) next.savings = patch.savings
      else delete next.savings
    }
    if (patch.languages !== undefined) {
      if (patch.languages) next.languages = patch.languages
      else delete next.languages
    }
    if (patch.calendar !== undefined) {
      if (patch.calendar) next.calendar = true
      else delete next.calendar
    }
    delete copy.config
    if (Object.keys(next).length > 0) {
      copy.config = next
      copy.visible = true
    }
    return copy
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
        const config = key === 'widgets' ? widgetsConfig((item as { config?: unknown }).config) : undefined
        if (config) entry.config = config
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
