// Горячие клавиши шапки для ПК (BACKLOG 79.8, срез 1): переходы «g» + буква и окно-шпаргалка по «?».
// Не срабатывают: в полях ввода, с Ctrl/Cmd/Alt, при открытом окне (диалоге), если событие уже обработано, и когда выключены в «Настройках»
// (ключ localStorage `hotkeys_off` = '1', синхронизируется между устройствами). «n» («+») и «/» (поиск) — после 79.6 и 79.1.
import { ref } from 'vue'

export interface HotkeyPage { letter: string; href: string; ru: string; en: string }

// Буквы выбраны по первой букве названия; при совпадении — по смыслу (календарь = k, магазин = h, сообщество = o, оформление = t).
export const HOTKEY_PAGES: readonly HotkeyPage[] = [
  { letter: 'd', href: '/dashboard/', ru: 'Дашборд', en: 'Dashboard' },
  { letter: 'g', href: '/goals/', ru: 'Цели', en: 'Goals' },
  { letter: 's', href: '/skills/', ru: 'Навыки', en: 'Skills' },
  { letter: 'w', href: '/workouts/', ru: 'Тренировки', en: 'Workouts' },
  { letter: 'c', href: '/challenges/', ru: 'Челленджи', en: 'Challenges' },
  { letter: 'l', href: '/languages/', ru: 'Языки', en: 'Languages' },
  { letter: 'k', href: '/calendar/', ru: 'Календарь', en: 'Calendar' },
  { letter: 'm', href: '/milestones/', ru: 'Вехи', en: 'Milestones' },
  { letter: 'h', href: '/shop/', ru: 'Магазин', en: 'Shop' },
  { letter: 'a', href: '/achievements/', ru: 'Достижения', en: 'Achievements' },
  { letter: 't', href: '/customization/', ru: 'Кастомизация', en: 'Customization' },
  { letter: 'o', href: '/community/', ru: 'Сообщество', en: 'Community' },
]

export const HOTKEYS_OFF_KEY = 'hotkeys_off'
export const SEQUENCE_MS = 1500

export function hotkeysEnabled(): boolean {
  try {
    return localStorage.getItem(HOTKEYS_OFF_KEY) !== '1'
  } catch {
    return true
  }
}
export function setHotkeysEnabled(on: boolean): void {
  try {
    if (on) localStorage.removeItem(HOTKEYS_OFF_KEY)
    else localStorage.setItem(HOTKEYS_OFF_KEY, '1')
  } catch {
    /* хранилище недоступно — выбор просто не запомнится */
  }
}

// Окно-шпаргалка (общее для App.vue и слушателя)
export const hotkeysHelpOpen = ref(false)

function isTypingTarget(el: EventTarget | null): boolean {
  const e = el as HTMLElement | null
  if (!e || !e.tagName) return false
  const tag = e.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.isContentEditable === true
}

function dialogOpen(doc: Document): boolean {
  return !!doc.querySelector('.gh-backdrop, .modal-backdrop, [role="dialog"], [aria-modal="true"]')
}

export interface HotkeyDeps {
  navigate: (href: string) => void
  enabled?: () => boolean
  now?: () => number
  doc?: Document
  currentPath?: () => string
}

// Возвращает обработчик keydown; состояние «нажато g» хранится внутри замыкания.
export function createHotkeyHandler(deps: HotkeyDeps): (e: KeyboardEvent) => void {
  const now = deps.now ?? (() => Date.now())
  const enabled = deps.enabled ?? hotkeysEnabled
  const doc = deps.doc ?? document
  let gAt = 0
  return (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
    if (isTypingTarget(e.target)) return
    if (!enabled()) return
    if (e.key === 'Escape' && hotkeysHelpOpen.value) {
      hotkeysHelpOpen.value = false
      return
    }
    if (e.key === '?') {
      if (dialogOpen(doc) && !hotkeysHelpOpen.value) return
      gAt = 0
      hotkeysHelpOpen.value = !hotkeysHelpOpen.value
      e.preventDefault()
      return
    }
    if (dialogOpen(doc)) {
      gAt = 0
      return
    }
    const key = e.key.length === 1 ? e.key.toLowerCase() : ''
    if (!key) return
    if (gAt && now() - gAt <= SEQUENCE_MS) {
      gAt = 0
      const page = HOTKEY_PAGES.find((p) => p.letter === key)
      if (page) {
        e.preventDefault()
        deps.navigate(page.href)
      }
      return
    }
    gAt = key === 'g' && !e.shiftKey ? now() : 0
  }
}
