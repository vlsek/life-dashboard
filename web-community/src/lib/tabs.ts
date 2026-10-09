// Вкладки страницы «Сообщество» (BACKLOG 44.13, срез 1): вместо одной длинной простыни — «Рейтинг», «Лента», «Друзья», «Сравнение».
export const TABS = ['rating', 'feed', 'friends', 'compare'] as const
export type TabKey = (typeof TABS)[number]
export const DEFAULT_TAB: TabKey = 'rating'
export const TAB_STORAGE_KEY = 'community_tab'

export function isTab(v: unknown): v is TabKey {
  return typeof v === 'string' && (TABS as readonly string[]).includes(v)
}

// Последняя открытая вкладка; любой сбой хранилища или мусор в нём — вкладка по умолчанию
export function loadTab(): TabKey {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY)
    return isTab(v) ? v : DEFAULT_TAB
  } catch {
    return DEFAULT_TAB
  }
}

export function saveTab(tab: TabKey): void {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  } catch {
    /* хранилище недоступно — вкладка просто не запомнится */
  }
}
