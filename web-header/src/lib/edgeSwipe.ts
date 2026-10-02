// Жест «свайп справа» (открыть панель) и «свайп вправо по панели» (закрыть). Чистая логика — отдельно от DOM, чтобы
// проверяться тестами. Пороги по образцу setupSidebarSwipe() в config.js, но зона шире: BACKLOG 18.1 — у владельца свайп
// «не открывал». Главная причина — на Android с жестовой навигацией крайние ~20–30 px справа занимает системное «назад»,
// поэтому жест, начатый ровно у края, до страницы не доходит. Теперь жест можно начинать в правой части экрана.
export const EDGE_ZONE_MIN_PX = 28 // нижняя граница зоны (узкие/широкие экраны)
export const EDGE_ZONE_RATIO = 0.2 // зона = 20% ширины экрана справа…
export const EDGE_ZONE_MAX_PX = 96 // …но не шире этого (на планшетах/десктопе)
export const MIN_DISTANCE_PX = 56 // палец должен уйти влево не меньше
export const MAX_SLOPE = 0.6 // |dy| / |dx| — ближе к горизонтали, иначе это прокрутка страницы

export interface Point {
  x: number
  y: number
}

export function openZonePx(viewportWidth: number): number {
  return Math.min(EDGE_ZONE_MAX_PX, Math.max(EDGE_ZONE_MIN_PX, Math.round(viewportWidth * EDGE_ZONE_RATIO)))
}

export function startsInOpenZone(start: Point, viewportWidth: number): boolean {
  return start.x >= viewportWidth - openZonePx(viewportWidth)
}

// Достаточно ли уже сдвинулся палец, чтобы считать это «свайпом влево» (используется и на touchmove, и на touchend)
export function isLeftSwipe(start: Point, now: Point): boolean {
  const dx = now.x - start.x
  const dy = now.y - start.y
  if (dx > -MIN_DISTANCE_PX) return false
  return Math.abs(dy) <= Math.abs(dx) * MAX_SLOPE
}

export function isOpenSwipe(start: Point, end: Point, viewportWidth: number): boolean {
  return startsInOpenZone(start, viewportWidth) && isLeftSwipe(start, end)
}

export function isCloseSwipe(start: Point, end: Point): boolean {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx < MIN_DISTANCE_PX) return false
  return Math.abs(dy) <= Math.abs(dx) * MAX_SLOPE
}

// Жест не наш, если палец лёг на то, что само реагирует на горизонтальное движение: ползунок, поле ввода, элемент с
// горизонтальной прокруткой (таблица, лента) или всё, что помечено data-no-swipe (например, график с перетаскиванием).
export function isSwipeBlockedTarget(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null
  while (el && el !== document.documentElement) {
    if (el.hasAttribute('data-no-swipe')) return true
    if (el instanceof HTMLInputElement && (el.type === 'range' || el.type === 'text' || el.type === 'number' || el.type === 'search')) return true
    if (el instanceof HTMLTextAreaElement) return true
    if (el.scrollWidth > el.clientWidth + 1) {
      const ox = getComputedStyle(el).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}
