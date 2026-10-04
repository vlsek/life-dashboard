// Жест «свайп справа» (открыть панель) и «свайп вправо по панели» (закрыть). Чистая логика — отдельно от DOM, чтобы
// проверяться тестами. Пороги по образцу setupSidebarSwipe() в config.js, но зона шире: BACKLOG 18.1 — у владельца свайп
// «не открывал». Главная причина — на Android с жестовой навигацией крайние ~20–30 px справа занимает системное «назад»,
// поэтому жест, начатый ровно у края, до страницы не доходит. Теперь жест можно начинать в правой части экрана.
export const EDGE_ZONE_MIN_PX = 28 // нижняя граница зоны (узкие/широкие экраны)
export const EDGE_ZONE_RATIO = 0.2 // зона = 20% ширины экрана справа…
export const EDGE_ZONE_MAX_PX = 96 // …но не шире этого (на планшетах/десктопе)
export const MIN_DISTANCE_PX = 56 // палец должен уйти влево не меньше
export const MAX_SLOPE = 0.6 // |dy| / |dx| — ближе к горизонтали, иначе это прокрутка страницы

// BACKLOG 07:52 — «почему свайп справа не с центра экрана?»: открывать можно и с середины. Вне узкой «краевой» зоны жест строже,
// чтобы не мешать обычному касанию и горизонтальной прокрутке: длиннее путь и почти строго горизонтально.
export const WIDE_ZONE_START_RATIO = 0.5 // «широкая» зона — правая половина экрана
export const WIDE_MIN_DISTANCE_PX = 84
export const WIDE_MAX_SLOPE = 0.4

export type SwipeZone = 'edge' | 'wide'

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

// Где начался жест: у края (мягкие пороги), в правой половине экрана (строгие) или вне зон (не наш)
export function swipeZone(start: Point, viewportWidth: number): SwipeZone | null {
  if (startsInOpenZone(start, viewportWidth)) return 'edge'
  return start.x >= viewportWidth * WIDE_ZONE_START_RATIO ? 'wide' : null
}

export function isWideLeftSwipe(start: Point, now: Point): boolean {
  const dx = now.x - start.x
  const dy = now.y - start.y
  if (dx > -WIDE_MIN_DISTANCE_PX) return false
  return Math.abs(dy) <= Math.abs(dx) * WIDE_MAX_SLOPE
}

export function isOpenSwipeFrom(zone: SwipeZone | null, start: Point, now: Point): boolean {
  if (zone === 'edge') return isLeftSwipe(start, now)
  if (zone === 'wide') return isWideLeftSwipe(start, now)
  return false
}

export function isOpenSwipe(start: Point, end: Point, viewportWidth: number): boolean {
  return isOpenSwipeFrom(swipeZone(start, viewportWidth), start, end)
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
    if (el instanceof HTMLCanvasElement || el.tagName === 'canvas') return true // графики: касание-перетаскивание показывает подсказку точки
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

// BACKLOG «При активном всплывающем окне нельзя вызывать левую и правую шторки»: пока на странице есть окно, правая шторка не открывается
// свайпом. Селектор общий с AppShell.vue всех пилотов (там левая шторка) — менять в обоих местах. Закрытие открытой шторки не затрагивается.
export const MODAL_SELECTOR = '.modal-backdrop, .gh-backdrop, .logout-backdrop'
export function isModalOpen(): boolean {
  return document.querySelector(MODAL_SELECTOR) !== null
}
