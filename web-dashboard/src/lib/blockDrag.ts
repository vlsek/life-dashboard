import { ref } from 'vue'
import { dropIndex, moveTo } from './dragReorder'
import type { DashboardBlockKey, LayoutItem } from './layout'

// Перетаскивание блоков Дашборда прямо на главной (пожелание владельца, 2026-10-03, продолжение BACKLOG 22 «Драг-энд-дроп блоков»):
// берёшь блок за ручку ☰ в его заголовке — поверх страницы появляется компактный список карточек блоков (сами блоки по высоте
// в несколько экранов, их не протащить), твоя карточка идёт за пальцем, остальные расступаются; отпустил — порядок сохраняется.
// Расчёт позиций — чистые функции (проверяются тестами без браузера); жест — composable useBlockDrag; рисует BlockDragOverlay.vue.

export const CARD_H = 56
export const CARD_GAP = 8
export const CARD_STEP = CARD_H + CARD_GAP
export const OVERLAY_EDGE = 8

// Верх списка карточек: перетаскиваемая карточка стартует под пальцем, но весь список остаётся в окне.
export function overlayTop(clientY: number, from: number, count: number, viewportH: number): number {
  const total = count * CARD_STEP - CARD_GAP
  const wanted = clientY - (from * CARD_STEP + CARD_H / 2)
  const max = Math.max(OVERLAY_EDGE, viewportH - OVERLAY_EDGE - total)
  return Math.min(Math.max(wanted, OVERLAY_EDGE), max)
}

// Середины карточек по вертикали (в исходном порядке) для dropIndex.
export function cardMids(top: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => top + i * CARD_STEP + CARD_H / 2)
}

// Перенос ВИДИМОГО блока fromVisible → toVisible: в списке остаются на своих местах скрытые блоки, переставляются только видимые.
// «Видимый» = isShown (по умолчанию visible; App добавляет условие для блока «Виджеты»: выбран хотя бы один виджет).
export type ShownFn = (item: LayoutItem) => boolean
const byVisible: ShownFn = (it) => it.visible

export function reorderVisible(layout: LayoutItem[], fromVisible: number, toVisible: number, isShown: ShownFn = byVisible): LayoutItem[] {
  const slots = layout.map((it, i) => (isShown(it) ? i : -1)).filter((i) => i >= 0)
  const next = layout.map((it) => ({ ...it }))
  if (fromVisible === toVisible || fromVisible < 0 || toVisible < 0 || fromVisible >= slots.length || toVisible >= slots.length) return next
  const moved = moveTo(
    slots.map((i) => layout[i]),
    fromVisible,
    toVisible,
  )
  slots.forEach((slot, k) => {
    next[slot] = { ...moved[k] }
  })
  return next
}

export interface BlockDragState {
  key: DashboardBlockKey
  from: number
  to: number
  dy: number
  startY: number
  top: number
  mids: number[]
}

// Жест. getLayout — текущая раскладка, commit — применить новую (родитель обновляет экран сразу и пишет в БД).
// onDown/onMove/onUp/onCancel вешаются на ручку (pointer events + pointer capture: жест не теряется, когда палец ушёл с ручки).
export function useBlockDrag(getLayout: () => LayoutItem[], commit: (next: LayoutItem[]) => void, viewportH: () => number = () => window.innerHeight, isShown: ShownFn = byVisible) {
  const drag = ref<BlockDragState | null>(null)
  let handleEl: HTMLElement | null = null
  let pointerId: number | null = null

  function onDown(e: PointerEvent, key: DashboardBlockKey) {
    if (e.button !== undefined && e.button > 0) return // только основная кнопка / касание
    const vis = getLayout().filter(isShown)
    const from = vis.findIndex((i) => i.key === key)
    if (from < 0 || vis.length < 2) return
    const top = overlayTop(e.clientY, from, vis.length, viewportH())
    drag.value = { key, from, to: from, dy: 0, startY: e.clientY, top, mids: cardMids(top, vis.length) }
    handleEl = e.currentTarget as HTMLElement | null
    pointerId = e.pointerId ?? null
    if (handleEl && pointerId !== null) handleEl.setPointerCapture?.(pointerId)
    // короткий отклик «схватил» там, где телефон это умеет
    try {
      navigator.vibrate?.(8)
    } catch {
      /* без вибрации */
    }
  }

  function onMove(e: PointerEvent) {
    const d = drag.value
    if (!d) return
    d.dy = e.clientY - d.startY
    d.to = dropIndex(d.mids, d.from, d.mids[d.from] + d.dy)
  }

  function finish(apply: boolean) {
    const d = drag.value
    if (!d) return
    drag.value = null
    if (handleEl && pointerId !== null) handleEl.releasePointerCapture?.(pointerId)
    handleEl = null
    pointerId = null
    if (apply && d.to !== d.from) commit(reorderVisible(getLayout(), d.from, d.to, isShown))
  }

  // Клавиатура на ручке: стрелки двигают блок на одну позицию среди видимых.
  function onKey(e: KeyboardEvent, key: DashboardBlockKey) {
    const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (!dir) return
    const from = getLayout().filter(isShown).findIndex((i) => i.key === key)
    if (from < 0) return
    e.preventDefault()
    const next = reorderVisible(getLayout(), from, from + dir, isShown)
    if (next.some((it, i) => it.key !== getLayout()[i].key)) commit(next)
  }

  return { drag, onDown, onMove, onUp: () => finish(true), onCancel: () => finish(false), onKey, cancel: () => finish(false) }
}
