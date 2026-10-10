import { isBlockShown, MAX_WIDGET_SKILLS, withWidgetConfig, type LayoutItem } from './layout'

// «Добавить виджет этой страницы на главную» (BACKLOG 54.3, срез 1): у части страниц есть соответствующий виджет блока «Виджеты» на Дашборде.
// Страница → вид виджета; у «Магазина» (виджет «Коплю на товар») кнопки пока нет — виджет требует выбора товара.
// Выбор хранится в `profiles.dashboard_layout` (поле `config` элемента `widgets`), миграция не нужна; менять раскладку — `withWidgetConfig`.
export type PageWidgetKind = 'calendar' | 'languages' | 'skills'

// ключи страниц как в favorites.pageKeyFor: languages → 'english'
const KIND_BY_PAGE: Record<string, PageWidgetKind> = { calendar: 'calendar', english: 'languages', skills: 'skills' }

export function pageWidgetKind(pageKey: string | null): PageWidgetKind | null {
  return pageKey ? (KIND_BY_PAGE[pageKey] ?? null) : null
}

// Виджет сейчас на главной: блок «Виджеты» показан и этот вид в нём выбран (languages — любой выбранный набор слов, не только 'all').
export function isWidgetOn(layout: LayoutItem[], kind: PageWidgetKind): boolean {
  const item = layout.find((i) => i.key === 'widgets')
  if (!item || !isBlockShown(item) || !item.config) return false
  if (kind === 'calendar') return item.config.calendar === true
  if (kind === 'languages') return !!item.config.languages
  return (item.config.skills?.length ?? 0) > 0
}

// Новая раскладка после нажатия. Добавление: календарь — вкл., языки — «все языки», навыки — переданные id (до MAX_WIDGET_SKILLS);
// навыков нет (пустой список) — null, добавлять нечего. Удаление выключает только этот вид, остальные виджеты не трогает.
export function widgetToggleLayout(layout: LayoutItem[], kind: PageWidgetKind, add: boolean, skillIds: string[] = []): LayoutItem[] | null {
  if (add) {
    if (kind === 'calendar') return withWidgetConfig(layout, { calendar: true })
    if (kind === 'languages') return withWidgetConfig(layout, { languages: 'all' })
    const ids = skillIds.slice(0, MAX_WIDGET_SKILLS)
    return ids.length > 0 ? withWidgetConfig(layout, { skills: ids }) : null
  }
  if (kind === 'calendar') return withWidgetConfig(layout, { calendar: false })
  if (kind === 'languages') return withWidgetConfig(layout, { languages: null })
  return withWidgetConfig(layout, { skills: [] })
}
