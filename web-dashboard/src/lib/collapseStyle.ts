// Вид сворачивания блоков (BACKLOG 498, решение владельца 2026-10-03): базовый шеврон — у всех бесплатно; «аккордеон» (раскрытие одного блока
// закрывает остальные) и «карточка со сводкой» — товары «Кастомизации». Выбор лежит в profiles.customization.collapse_style (ключ предмета),
// а страницы Дашборда/Workouts применяют его БЕЗ ожидания сети — через кэш в localStorage (как тема): кэш пишет страница «Кастомизация»
// при выборе, а сами страницы сверяются с профилем в фоне. Чистая логика (без Vue/сети). Пилоты изолированы, поэтому КОПИЯ лежит в
// web-customization и web-dashboard (менять ВМЕСТЕ — страж collapseStyleCopies.test.ts в web-customization сверяет файлы).
export type CollapseStyle = 'chevron' | 'accordion' | 'summary'

export const COLLAPSE_STYLE_CACHE_KEY = 'site_collapse_style'

// Ключ предмета из реестра «Кастомизации» → вариант; всё неизвестное и пустое — базовый шеврон.
const BY_ITEM: Record<string, CollapseStyle> = { collapse_accordion: 'accordion', collapse_summary: 'summary' }

export function parseCollapseStyle(raw: unknown): CollapseStyle {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(BY_ITEM, raw) ? BY_ITEM[raw] : 'chevron'
}

export function readCachedCollapseStyle(): CollapseStyle {
  try {
    const v = localStorage.getItem(COLLAPSE_STYLE_CACHE_KEY)
    return v === 'accordion' || v === 'summary' ? v : 'chevron'
  } catch {
    return 'chevron'
  }
}

export function writeCachedCollapseStyle(style: CollapseStyle): void {
  try {
    if (style === 'chevron') localStorage.removeItem(COLLAPSE_STYLE_CACHE_KEY)
    else localStorage.setItem(COLLAPSE_STYLE_CACHE_KEY, style)
  } catch {
    // нет localStorage (приватный режим) — применится после загрузки профиля
  }
}
