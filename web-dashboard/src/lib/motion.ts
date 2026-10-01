// Общий выключатель «отключить все анимации» (BACKLOG 16, 14:02). Выбор человека хранится в
// localStorage (`site_motion` = 'off'), а до появления раздела «Глобальные настройки» переключатель живёт в
// окне «Настроить Дашборд». Флаг отражается атрибутом <html data-motion="off">: его читают общее CSS-правило
// в style.css (гасит ВСЕ animation/transition), collapseMotion.ts, pointsFloat.ts. По умолчанию (выбора нет)
// движением управляет системное «уменьшение движения» (prefers-reduced-motion) — оно работает и без флага.
export const MOTION_KEY = 'site_motion'

export function userMotionOff(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === 'off'
  } catch {
    return false
  }
}

export function systemReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

// Итог для интерфейса: анимации выключены выбором человека ИЛИ системной настройкой.
export function motionDisabled(): boolean {
  return userMotionOff() || systemReducedMotion()
}

// Привести <html data-motion> в соответствие с выбором человека (системная настройка — отдельно, через CSS).
export function applyMotion(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (userMotionOff()) root.setAttribute('data-motion', 'off')
  else root.removeAttribute('data-motion')
}

export function setMotionOff(off: boolean): void {
  try {
    if (off) localStorage.setItem(MOTION_KEY, 'off')
    else localStorage.removeItem(MOTION_KEY)
  } catch {
    /* приватный режим: применим на эту сессию, но не запомним */
  }
  if (typeof document === 'undefined') return
  if (off) document.documentElement.setAttribute('data-motion', 'off')
  else document.documentElement.removeAttribute('data-motion')
}
