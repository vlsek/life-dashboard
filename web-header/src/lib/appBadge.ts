// Бейдж иконки установленного приложения (BACKLOG 79.5): число невыполненного за сегодня = всего − сделано по дневному кольцу.
// Badging API есть не везде (установленный PWA в Chrome/Edge, Safari 17+); без него и вне установки молча ничего не делаем.
export interface DayCount { done: number; total: number }

export function badgeCount(p: DayCount | null | undefined): number {
  if (!p || !(p.total > 0)) return 0
  return Math.max(0, Math.round(p.total - p.done))
}

type BadgeNav = { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }

export async function applyBadge(count: number, nav: BadgeNav = navigator as unknown as BadgeNav): Promise<void> {
  try {
    if (count > 0) await nav.setAppBadge?.(count)
    else await nav.clearAppBadge?.()
  } catch {
    /* не установлено или запрещено — бейдж не критичен */
  }
}
