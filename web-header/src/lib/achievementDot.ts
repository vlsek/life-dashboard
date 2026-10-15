// Красная точка у пункта меню «Достижения» (BACKLOG 52.1 срез 5): поздравление-карточка закрывается, а точка остаётся, пока человек не откроет
// страницу «Достижения». Меню у каждой страницы своё (AppShell каждого пилота), поэтому точку ставит шапка: находит ссылку на /achievements/ и
// дописывает значок. «Не открывал» хранится на устройстве (localStorage): само поздравление дедуплицирует сервер, точка — лишь напоминание.
export const UNSEEN_KEY = 'gh_ach_unseen'
export const DOT_CLASS = 'gh-ach-dot'
const LINK = 'a[href="/achievements/"], a[href="/achievements"], a[href="/achievements/index.html"]'
const EXCLUDE = '#gh-ach-toast, .gh-secach-link' // «Все достижения →» в блоке шапки и сама карточка — не пункт меню

export function hasUnseen(): boolean {
  try {
    return localStorage.getItem(UNSEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markUnseen() {
  try {
    localStorage.setItem(UNSEEN_KEY, '1')
  } catch {
    /* приватный режим: точка проживёт до перезагрузки страницы */
  }
  applyDot()
}

export function clearUnseen() {
  try {
    localStorage.removeItem(UNSEEN_KEY)
  } catch {
    /* ignore */
  }
  removeDots()
}

export function removeDots(root: ParentNode = document) {
  root.querySelectorAll('.' + DOT_CLASS).forEach((el) => el.remove())
}

// Ставит точку на каждую ссылку меню без неё; без новых достижений ничего не делает.
export function applyDot(root: ParentNode = document, force = false) {
  if (!force && !hasUnseen()) return
  root.querySelectorAll<HTMLAnchorElement>(LINK).forEach((a) => {
    if (a.closest(EXCLUDE) || a.querySelector('.' + DOT_CLASS)) return
    const dot = document.createElement('span')
    dot.className = DOT_CLASS
    dot.setAttribute('aria-hidden', 'true')
    a.appendChild(dot)
  })
}

// Меню рисуется после загрузки данных и может перерисовываться (Vue заменяет ссылки) — держим точку, пока она нужна. Возвращает «стоп».
let stopCurrent: (() => void) | null = null
export function watchDot(): () => void {
  if (stopCurrent) return stopCurrent // уже следим: второй наблюдатель не нужен
  if (typeof MutationObserver === 'undefined') return () => {}
  let scheduled = false
  const obs = new MutationObserver(() => {
    if (scheduled) return
    scheduled = true
    setTimeout(() => {
      scheduled = false
      applyDot()
    }, 150)
  })
  obs.observe(document.body, { childList: true, subtree: true })
  applyDot()
  stopCurrent = () => {
    obs.disconnect()
    stopCurrent = null
  }
  return stopCurrent
}
