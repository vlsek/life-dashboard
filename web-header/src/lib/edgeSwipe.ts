// Жест «свайп от правого края» (открыть панель) и «свайп вправо по панели» (закрыть). Чистая логика — отдельно
// от DOM, чтобы проверяться тестами. Пороги по образцу setupSidebarSwipe() в config.js.
export const EDGE_ZONE_PX = 28 // палец должен начаться не дальше этого от правого края экрана
export const MIN_DISTANCE_PX = 60 // и уйти влево не меньше
export const MAX_SLOPE = 0.7 // |dy| / |dx| — ближе к горизонтали, иначе это прокрутка страницы

export interface Point {
  x: number
  y: number
}

export function isOpenSwipe(start: Point, end: Point, viewportWidth: number): boolean {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (start.x < viewportWidth - EDGE_ZONE_PX) return false
  if (dx > -MIN_DISTANCE_PX) return false
  return Math.abs(dy) <= Math.abs(dx) * MAX_SLOPE
}

export function isCloseSwipe(start: Point, end: Point): boolean {
  const dx = end.x - start.x
  const dy = end.y - start.y
  if (dx < MIN_DISTANCE_PX) return false
  return Math.abs(dy) <= Math.abs(dx) * MAX_SLOPE
}
