// КОПИЯ web-dashboard/src/lib/usePointsFloat.ts (BACKLOG 469, агент 2). Менять ВМЕСТЕ с оригиналом.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getLang } from './i18n'
import {
  POINTS_FLOAT,
  clampX,
  formatPointsDelta,
  motionMode,
  pickOrigin,
  type MotionMode,
  type PointsFloatDetail,
} from './pointsFloat'

// Состояние компонента PointsFloat.vue (BACKLOG 14, 11:11): ловит событие POINTS_FLOAT, ставит «+N / −N» у места
// последнего клика/касания и убирает его по таймеру. Отдельный композабл, чтобы логика тестировалась без DOM-анимации.

export interface FloatItem {
  id: number
  delta: number
  text: string
  x: number
  y: number
  mode: MotionMode // 'full' — плывёт вверх; 'reduced' — на месте, только проявление/угасание
}

export const FLOAT_MS = 1700 // длительность полёта (должна совпадать с animation-duration в PointsFloat.vue)
export const FLOAT_REDUCED_MS = 1200
export const MAX_ITEMS = 6 // больше одновременно не рисуем: при очень быстрых нажатиях старые просто исчезают раньше
const STACK_STEP_PX = 24 // каждая ещё не погасшая подпись у того же места сдвигает новую вверх, чтобы не слипались
const TOUCH_LIFT_PX = 30 // палец закрывает точку касания — поднимаем подпись над ним
const FALLBACK_Y_RATIO = 0.45 // нет недавнего клика (например, клавиатура без фокуса) — по центру экрана чуть выше середины

export function usePointsFloat() {
  const items = ref<FloatItem[]>([])
  let seq = 0
  let last: { x: number; y: number; at: number } | null = null
  const timers = new Map<number, ReturnType<typeof setTimeout>>()

  function remember(x: number, y: number) {
    last = { x, y, at: Date.now() }
  }
  function onPointer(e: PointerEvent) {
    remember(e.clientX, e.clientY)
  }
  // Отметка с клавиатуры (пробел/Enter на чекбоксе): точки клика нет — берём центр элемента в фокусе.
  function onKey(e: KeyboardEvent) {
    if (e.key !== ' ' && e.key !== 'Enter') return
    const el = document.activeElement as HTMLElement | null
    const r = el?.getBoundingClientRect?.()
    if (r && (r.width > 0 || r.height > 0)) remember(r.left + r.width / 2, r.top)
  }

  function drop(id: number) {
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    items.value = items.value.filter((it) => it.id !== id)
  }

  function push(delta: number) {
    const text = formatPointsDelta(delta, getLang())
    const mode = motionMode()
    if (!text || mode === 'off') return
    const origin = pickOrigin(last, Date.now())
    const width = typeof window !== 'undefined' ? window.innerWidth : 360
    const height = typeof window !== 'undefined' ? window.innerHeight : 640
    const baseX = origin ? origin.x : width / 2
    const baseY = origin ? origin.y - TOUCH_LIFT_PX : height * FALLBACK_Y_RATIO
    const concurrent = items.value.filter((it) => Math.abs(it.x - clampX(baseX, width)) < 60 && Math.abs(it.y - baseY) < 80).length
    const item: FloatItem = {
      id: ++seq,
      delta,
      text,
      x: clampX(baseX, width),
      y: Math.max(baseY - concurrent * STACK_STEP_PX, 24),
      mode,
    }
    items.value = [...items.value, item].slice(-MAX_ITEMS)
    // слишком старые, вытесненные из списка, таймеры уже не нужны
    for (const id of [...timers.keys()]) if (!items.value.some((it) => it.id === id)) drop(id)
    timers.set(item.id, setTimeout(() => drop(item.id), (mode === 'reduced' ? FLOAT_REDUCED_MS : FLOAT_MS) + 100))
  }

  function onFloat(e: Event) {
    const detail = (e as CustomEvent<PointsFloatDetail>).detail
    if (detail && typeof detail.delta === 'number') push(detail.delta)
  }

  onMounted(() => {
    window.addEventListener(POINTS_FLOAT, onFloat)
    // capture + passive: видим клик раньше обработчиков элементов и не мешаем прокрутке
    window.addEventListener('pointerdown', onPointer, { capture: true, passive: true })
    window.addEventListener('keydown', onKey, { capture: true, passive: true })
  })
  onBeforeUnmount(() => {
    window.removeEventListener(POINTS_FLOAT, onFloat)
    window.removeEventListener('pointerdown', onPointer, { capture: true })
    window.removeEventListener('keydown', onKey, { capture: true })
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
  })

  return { items, push }
}
