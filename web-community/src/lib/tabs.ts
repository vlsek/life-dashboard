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

// «Без соревнований» (BACKLOG 78.4): личный выключатель. Скрывает «Рейтинг» и «Сравнение» (подиум живёт на «Рейтинге») и место в шапке профиля;
// «Лента» и «Друзья» остаются. Хранится в localStorage (ключ синхронизирует шапка между устройствами через profiles.ui_settings, 064).
export const NO_COMPETE_KEY = 'community_no_compete'
export const COMPETE_TABS: readonly TabKey[] = ['rating', 'compare']
export const NO_COMPETE_FALLBACK_TAB: TabKey = 'feed'

export function tabsFor(noCompete: boolean): readonly TabKey[] {
  return noCompete ? TABS.filter((k) => !COMPETE_TABS.includes(k)) : TABS
}

// Вкладка, которую можно показать при текущем режиме: соревновательная при выключателе заменяется на «Ленту»
export function effectiveTab(tab: TabKey, noCompete: boolean): TabKey {
  return tabsFor(noCompete).includes(tab) ? tab : NO_COMPETE_FALLBACK_TAB
}

export function loadNoCompete(): boolean {
  try {
    return localStorage.getItem(NO_COMPETE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveNoCompete(on: boolean): void {
  try {
    if (on) localStorage.setItem(NO_COMPETE_KEY, '1')
    else localStorage.removeItem(NO_COMPETE_KEY)
  } catch {
    /* хранилище недоступно — выбор просто не запомнится */
  }
}
