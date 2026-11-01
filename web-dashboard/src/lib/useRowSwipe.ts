import { ref } from 'vue'

// Свайп по строке (BACKLOG 75.9, срез 2): вправо — выполнить, влево — отложить. Жест — УСКОРИТЕЛЬ: у строки есть видимые кнопки.
// • намерение определяем по первым пикселям: горизонтальное (|dx| заметно больше |dy|) — берём жест и тянем строку; вертикальное — это
//   скролл, жест отпускаем и страница прокручивается как обычно (на строке `touch-action: pan-y`);
// • срабатывает при смещении ≥ threshold, иначе строка возвращается; направления, которые для строки недоступны, не тянутся;
// • после сработавшего свайпа ближайший click подавляется (палец мог отпуститься на чекбоксе);
// • на полях ввода, кнопках и ссылках жест не начинается.
export interface RowSwipeOptions {
  canRight: (index: number) => boolean
  canLeft: (index: number) => boolean
  onRight: (index: number) => void
  onLeft: (index: number) => void
  threshold?: number // px
  deadzone?: number // px до выбора направления
  maxPull?: number // px, дальше строку не тянем
  now?: () => number
  vibrate?: boolean
}

const IGNORE = 'input:not([type=checkbox]):not([type=radio]), textarea, select, button, a[href], [contenteditable=""], [contenteditable="true"]'

export function useRowSwipe(opts: RowSwipeOptions) {
  const threshold = opts.threshold ?? 80
  const deadzone = opts.deadzone ?? 10
  const maxPull = opts.maxPull ?? 140
  const now = opts.now ?? (() => Date.now())
  const active = ref<{ index: number; dx: number } | null>(null)
  let start: { x: number; y: number; index: number; el: HTMLElement | null; id: number | null } | null = null
  let locked = false
  let suppressUntil = -Infinity

  function reset() {
    if (start?.el && start.id !== null) start.el.releasePointerCapture?.(start.id)
    start = null
    locked = false
    active.value = null
  }

  const down = (e: PointerEvent, index: number) => {
    if (e.button !== undefined && e.button > 0) return
    if ((e.target as Element | null)?.closest?.(IGNORE)) return
    reset()
    start = { x: e.clientX, y: e.clientY, index, el: (e.currentTarget as HTMLElement | null) ?? null, id: e.pointerId ?? null }
  }

  const move = (e: PointerEvent) => {
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (!locked) {
      if (Math.abs(dx) < deadzone && Math.abs(dy) < deadzone) return
      if (Math.abs(dx) > Math.abs(dy) * 1.5) {
        locked = true
        if (start.el && start.id !== null) start.el.setPointerCapture?.(start.id)
      } else {
        reset() // вертикальное движение — скролл
        return
      }
    }
    const allowed = dx > 0 ? opts.canRight(start.index) : opts.canLeft(start.index)
    active.value = { index: start.index, dx: allowed ? Math.max(-maxPull, Math.min(maxPull, dx)) : 0 }
  }

  const up = () => {
    const a = active.value
    const s = start
    const wasLocked = locked
    reset()
    if (!wasLocked || !a || !s) return
    suppressUntil = now() + 350
    if (a.dx >= threshold && opts.canRight(a.index)) {
      if (opts.vibrate !== false) navigator.vibrate?.(10)
      opts.onRight(a.index)
    } else if (a.dx <= -threshold && opts.canLeft(a.index)) {
      if (opts.vibrate !== false) navigator.vibrate?.(10)
      opts.onLeft(a.index)
    }
  }

  const cancel = () => reset()

  const clickCapture = (e: Event) => {
    if (now() < suppressUntil) {
      suppressUntil = -Infinity
      e.preventDefault()
      e.stopPropagation()
    }
  }

  // v-bind-объект для строки: <tr v-bind="swipeBind(i)">
  const bind = (index: number) => ({
    onPointerdown: (e: PointerEvent) => down(e, index),
    onPointermove: move,
    onPointerup: up,
    onPointercancel: cancel,
    onClickCapture: clickCapture,
  })

  // Смещение строки и подсказка направления (цвет фона): вправо — «выполнено», влево — «на завтра»
  const styleFor = (index: number): Record<string, string> => {
    const a = active.value
    if (!a || a.index !== index || a.dx === 0) return {}
    return { transform: `translateX(${a.dx}px)`, transition: 'none' }
  }
  const hintFor = (index: number): 'right' | 'left' | null => {
    const a = active.value
    if (!a || a.index !== index || Math.abs(a.dx) < threshold) return null
    return a.dx > 0 ? 'right' : 'left'
  }

  return { active, bind, styleFor, hintFor, cancel }
}
