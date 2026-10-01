import type { Directive } from 'vue'

// v-collapse="открыто" — замена v-show с плавной анимацией высоты (BACKLOG 9: сворачивание выглядело устаревшим).
// Поведение v-show сохранено: тело остаётся в DOM (компоненты не теряют данные), скрывается через display:none.
// Анимации нет при первом показе (сохранённое «свёрнуто» из localStorage подхватывается сразу), при
// prefers-reduced-motion и когда анимировать нечего (высота 0).
const DURATION = 220
const PROPS = ['height', 'paddingTop', 'paddingBottom', 'marginTop', 'marginBottom', 'borderTopWidth', 'borderBottomWidth', 'opacity'] as const
type Snap = Record<(typeof PROPS)[number], string>
type El = HTMLElement & { _collapseTimer?: ReturnType<typeof setTimeout>; _collapseDisplay?: string }

const CLOSED: Snap = { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', opacity: '0' }

function reducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'off') return true // выключатель «все анимации» (BACKLOG 16, 14:02)
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Значения «полностью открытого» состояния (высота с учётом box-sizing, чтобы в конце не было скачка).
function openSnapshot(el: HTMLElement): Snap | null {
  if (!el.scrollHeight) return null
  const cs = getComputedStyle(el)
  const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)
  const height = cs.boxSizing === 'border-box' ? el.scrollHeight + border : el.scrollHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  return {
    height: `${height}px`,
    paddingTop: cs.paddingTop,
    paddingBottom: cs.paddingBottom,
    marginTop: cs.marginTop,
    marginBottom: cs.marginBottom,
    borderTopWidth: cs.borderTopWidth,
    borderBottomWidth: cs.borderBottomWidth,
    opacity: '1',
  }
}

function apply(el: HTMLElement, s: Snap) {
  for (const p of PROPS) el.style[p] = s[p]
}

function reset(el: El) {
  if (el._collapseTimer) clearTimeout(el._collapseTimer)
  el._collapseTimer = undefined
  for (const p of PROPS) el.style[p] = ''
  el.style.overflow = ''
  el.style.transition = ''
}

function animate(el: El, from: Snap, to: Snap, done: () => void) {
  el.style.overflow = 'hidden'
  apply(el, from)
  void el.offsetHeight // фиксируем стартовое состояние до включения transition
  el.style.transition = PROPS.map((p) => `${p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())} ${DURATION}ms ease`).join(', ')
  apply(el, to)
  el._collapseTimer = setTimeout(() => {
    reset(el)
    done()
  }, DURATION)
}

function show(el: El, withMotion: boolean) {
  reset(el)
  el.style.display = el._collapseDisplay ?? ''
  if (!withMotion || reducedMotion()) return
  const open = openSnapshot(el)
  if (open) animate(el, CLOSED, open, () => {})
}

function hide(el: El, withMotion: boolean) {
  reset(el)
  const open = withMotion && !reducedMotion() ? openSnapshot(el) : null
  if (!open) {
    el.style.display = 'none'
    return
  }
  animate(el, open, CLOSED, () => {
    el.style.display = 'none'
  })
}

export const vCollapse: Directive<HTMLElement, boolean> = {
  beforeMount(el: El, { value }) {
    el._collapseDisplay = el.style.display === 'none' ? '' : el.style.display
    if (!value) el.style.display = 'none'
  },
  updated(el: El, { value, oldValue }) {
    if (!!value === !!oldValue) return
    if (value) show(el, true)
    else hide(el, true)
  },
  unmounted(el: El) {
    reset(el)
  },
}
