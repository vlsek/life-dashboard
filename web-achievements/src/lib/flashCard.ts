// Подсветка карточки после перехода из витрины (BACKLOG 81.2): скролл к ней и короткая рамка. Без анимации скролла, если человек её отключил
// (системное «уменьшить движение» или наш выключатель html[data-motion=off]).
export const FLASH_CLASS = 'ach-flash'
export const FLASH_MS = 1800

function calmMotion(): boolean {
  try {
    if (document.documentElement.getAttribute('data-motion') === 'off') return true
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function flashCard(el: HTMLElement | null): boolean {
  if (!el) return false
  if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: calmMotion() ? 'auto' : 'smooth' })
  el.classList.add(FLASH_CLASS)
  setTimeout(() => el.classList.remove(FLASH_CLASS), FLASH_MS)
  return true
}
