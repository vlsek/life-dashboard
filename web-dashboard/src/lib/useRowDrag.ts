import { computed, onBeforeUnmount, ref } from 'vue'
import { dropIndex, moveTo, rowShift } from './dragReorder'

// Общий жест перетаскивания строк списка за ручку ☰ (BACKLOG 6.2 «Драг-энд-дроп блоков», 2026-10-06 — то же в окне настройки графиков).
// Вынесен из BlockOrderList.vue БЕЗ изменения поведения. Строки — непосредственные дети контейнера (`:ref="setListEl"`): размеры снимаются
// с них в момент нажатия, поэтому строки можно удалять/добавлять (массив ref-ов по индексу после удаления «протухает»).
// Расчёт позиций — чистые функции из ./dragReorder; здесь только жест (pointer events + pointer capture: жест не теряется, когда палец ушёл с ручки).
export interface RowDragState {
  from: number
  to: number
  dy: number
  mids: number[]
  heights: number[]
  startY: number
  step: number
}

export function useRowDrag<T>(getList: () => T[], commit: (next: T[]) => void) {
  const listEl = ref<HTMLElement | null>(null)
  const drag = ref<RowDragState | null>(null)
  let handleEl: HTMLElement | null = null
  let pointerId: number | null = null

  function onDown(e: PointerEvent, index: number) {
    if (e.button !== undefined && e.button > 0) return // только основная кнопка / касание
    const els = Array.from(listEl.value?.children ?? []) as HTMLElement[]
    const rects = els.map((el) => el.getBoundingClientRect())
    const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0
    drag.value = {
      from: index,
      to: index,
      dy: 0,
      startY: e.clientY,
      mids: rects.map((r) => r.top + r.height / 2),
      heights: rects.map((r) => r.height),
      step: (rects[index]?.height ?? 0) + gap,
    }
    handleEl = e.currentTarget as HTMLElement
    pointerId = e.pointerId ?? null
    if (pointerId !== null) handleEl.setPointerCapture?.(pointerId)
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
    if (apply && d.to !== d.from) commit(moveTo(getList(), d.from, d.to))
  }
  const onUp = () => finish(true)
  const onCancel = () => finish(false)

  // Клавиатура на ручке: стрелки двигают на одну позицию
  function onKey(e: KeyboardEvent, index: number) {
    const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
    if (!dir) return
    e.preventDefault()
    commit(moveTo(getList(), index, index + dir))
  }

  function rowStyle(j: number) {
    const d = drag.value
    if (!d) return {}
    if (j === d.from) return { transform: `translateY(${d.dy}px)`, zIndex: 2, boxShadow: '0 8px 22px rgba(0,0,0,0.35)', transition: 'none', cursor: 'grabbing' }
    const shift = rowShift(j, d.from, d.to, d.step)
    return { transform: shift ? `translateY(${shift}px)` : undefined, transition: 'transform 0.15s ease' }
  }

  const dragging = computed(() => drag.value !== null)
  onBeforeUnmount(() => finish(false))

  // функция-ссылка для контейнера: <div :ref="setListEl">
  const setListEl = (el: unknown) => {
    listEl.value = (el as HTMLElement | null) ?? null
  }

  return { setListEl, drag, dragging, onDown, onMove, onUp, onCancel, onKey, rowStyle }
}
