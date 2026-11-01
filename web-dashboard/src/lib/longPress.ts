// Долгое нажатие (BACKLOG 75.9): удержание на плашке открывает быстрые действия. Жест — УСКОРИТЕЛЬ, а не единственный путь:
// у плашки есть видимая кнопка ⋯, правый клик и клавиатура (Shift+F10 / клавиша «меню») работают тем же обработчиком.
//  • палец сдвинулся дальше `tolerance` (начался скролл) или pointercancel — удержание отменяется;
//  • после сработавшего удержания следующий click подавляется (иначе отпускание пальца на чекбоксе его переключило бы);
//  • contextmenu: на ПК — правый клик открывает сразу; на Android долгое касание тоже шлёт contextmenu — дубль не открываем;
//  • на полях ввода, кнопках и ссылках жест не включается (там удержание — выделение текста или повтор действия).
export interface LongPressOptions {
  onTrigger: (e: Event) => void
  delay?: number // мс
  tolerance?: number // px
  now?: () => number
  vibrate?: boolean
}

const IGNORE = 'input:not([type=checkbox]):not([type=radio]), textarea, select, button, a[href], [contenteditable=""], [contenteditable="true"]'
export const isLongPressIgnored = (t: EventTarget | null): boolean => !!(t as Element | null)?.closest?.(IGNORE)

export function createLongPress(opts: LongPressOptions) {
  const delay = opts.delay ?? 500
  const tolerance = opts.tolerance ?? 10
  const now = opts.now ?? (() => Date.now())
  let timer: ReturnType<typeof setTimeout> | null = null
  let sx = 0
  let sy = 0
  let fired = false
  let firedAt = -Infinity
  let suppressUntil = -Infinity

  const clear = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  function fire(e: Event) {
    fired = true
    firedAt = now()
    if (opts.vibrate !== false) navigator.vibrate?.(10)
    opts.onTrigger(e)
  }

  return {
    pointerdown(e: PointerEvent) {
      if (e.button !== undefined && e.button > 0) return // только касание / основная кнопка
      clear()
      fired = false
      if (isLongPressIgnored(e.target)) return
      sx = e.clientX
      sy = e.clientY
      timer = setTimeout(() => {
        timer = null
        fire(e)
      }, delay)
    },
    pointermove(e: PointerEvent) {
      if (timer === null) return
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > tolerance) clear()
    },
    pointerup() {
      clear()
      if (fired) suppressUntil = now() + 350 // click, который браузер пришлёт сразу за отпусканием, глотаем
      fired = false
    },
    pointercancel() {
      clear()
      fired = false
    },
    // capture-обработчик click
    clickCapture(e: Event) {
      if (now() < suppressUntil) {
        suppressUntil = -Infinity
        e.preventDefault()
        e.stopPropagation()
      }
    },
    contextmenu(e: Event) {
      if (isLongPressIgnored(e.target)) return // в поле ввода — родное меню (копировать/вставить)
      e.preventDefault()
      clear()
      if (now() - firedAt < 1000) return // дубль долгого касания на Android
      fire(e)
    },
    keydown(e: KeyboardEvent) {
      if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return
      if (isLongPressIgnored(e.target)) return
      e.preventDefault()
      fire(e)
    },
    cancel: () => {
      clear()
      fired = false
    },
  }
}

// v-bind-объект для нативного элемента: <div v-bind="longPressBind(lp)">
export function longPressBind(lp: ReturnType<typeof createLongPress>) {
  return {
    onPointerdown: lp.pointerdown,
    onPointermove: lp.pointermove,
    onPointerup: lp.pointerup,
    onPointercancel: lp.pointercancel,
    onClickCapture: lp.clickCapture,
    onContextmenu: lp.contextmenu,
    onKeydown: lp.keydown,
  }
}
