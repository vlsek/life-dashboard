// Сворачиваемые секции Дашборда: тот же ключ localStorage, что в классике (dashboard.js, createCollapsibleSection):
// "dash_collapsed:<ключ>" = "1" (свёрнуто) / "0" (развёрнуто). Нет записи = развёрнуто.
export const COLLAPSED_PREFIX = 'dash_collapsed:'

export function readCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(COLLAPSED_PREFIX + key) === '1'
  } catch {
    return false
  }
}

export function writeCollapsed(key: string, collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_PREFIX + key, collapsed ? '1' : '0')
  } catch {
    // приватный режим/переполнение — состояние просто не запомнится
  }
}
