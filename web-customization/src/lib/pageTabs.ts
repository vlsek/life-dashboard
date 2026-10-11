// Вкладки страницы «Кастомизация» (BACKLOG 54.7): раньше все разделы шли одной длинной лентой («ща ппц перегружено»).
// Каждый раздел витрины — своя вкладка, показывается один за раз; «Все» (последней) возвращает прежнюю ленту. Выбор помним на устройстве.
export const ALL_TAB = 'all'
const KEY = 'cust_tab'

export function readTab(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
export function writeTab(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* выбор вкладки не критичен */
  }
}

// Какая вкладка открыта: сохранённая, если такая вкладка сейчас есть (раздел мог исчезнуть из-за фильтра видимости), иначе первая.
export function resolveTab(stored: string | null, ids: readonly string[]): string {
  if (stored === ALL_TAB) return ALL_TAB
  if (stored && ids.includes(stored)) return stored
  return ids[0] ?? ALL_TAB
}

// Показывать ли раздел: открыта его вкладка или «Все».
export const showsSection = (tab: string, id: string): boolean => tab === ALL_TAB || tab === id
