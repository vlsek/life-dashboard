import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'

// Клавиатура и фокус в окнах магазина (BACKLOG 72.5, срез 4). Пока окно открыто: фокус заходит внутрь, Tab и Shift+Tab ходят по кругу внутри окна,
// Esc закрывает (если передан onClose), а при закрытии фокус возвращается на то, что было в фокусе до открытия (кнопка-открывашка).
// Окно может быть корнем компонента (ItemForm) или появляться и исчезать внутри него (ShopIdea): следим за самим элементом.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function focusablesIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.hidden && !el.closest('[hidden]') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden')
}

export function useModalA11y(root: Ref<HTMLElement | null>, opts: { onClose?: () => void } = {}) {
  let opener: HTMLElement | null = null
  let active = false

  function onKeydown(e: KeyboardEvent) {
    const el = root.value
    if (!el) return
    if (e.key === 'Escape') {
      // поверх окна открыто подтверждение — Esc относится к нему, оно закроется само
      if (opts.onClose && !document.querySelector('[data-test="confirm-dialog"]')) opts.onClose()
      return
    }
    if (e.key !== 'Tab') return
    const items = focusablesIn(el)
    if (items.length === 0) { e.preventDefault(); el.focus(); return }
    const first = items[0]
    const last = items[items.length - 1]
    const cur = document.activeElement as HTMLElement | null
    if (!cur || !el.contains(cur)) { e.preventDefault(); first.focus(); return } // фокус оказался за окном (клик по фону и т.п.) — возвращаем внутрь
    if (e.shiftKey && cur === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus() }
  }

  function activate(el: HTMLElement) {
    if (active) return
    active = true
    opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1') // запасная цель, если внутри нечего фокусировать
    const target = el.querySelector<HTMLElement>('[data-autofocus]') ?? focusablesIn(el)[0] ?? el
    target.focus()
    document.addEventListener('keydown', onKeydown)
  }

  function deactivate() {
    if (!active) return
    active = false
    document.removeEventListener('keydown', onKeydown)
    const back = opener
    opener = null
    if (back && back.isConnected) back.focus()
  }

  watch(root, (el) => (el ? activate(el) : deactivate()), { flush: 'post' })
  onMounted(() => { if (root.value) activate(root.value) })
  onBeforeUnmount(deactivate)
}
