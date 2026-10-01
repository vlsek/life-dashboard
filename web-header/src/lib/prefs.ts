// Мелкие пользовательские настройки, которые живут в localStorage и применяются сразу. Ключи и поведение — те же, что
// в пилотах (чтобы глобальные настройки и настройки на страницах не расходились):
//   site_lang (язык; смена перезагружает страницу), site_theme (+ классы theme-* на <html>), site_motion = 'off'
//   (<html data-motion="off">, BACKLOG 16), streak_celebrations_off = '1' (поздравления за серии, BACKLOG 13).
export const THEME_KEYS = { dark: 'theme_dark', monet: 'theme_monet', light: 'theme_light', pink: 'theme_pink' } as const
export type ThemeKey = keyof typeof THEME_KEYS

const THEME_BG: Record<ThemeKey, string> = { dark: '#121212', monet: '#0d0703', light: '#f7f4ef', pink: '#fff0f5' }

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* приватный режим: настройка применится до перезагрузки */
  }
}

export function getTheme(): ThemeKey {
  const v = read('site_theme')
  return v && v in THEME_KEYS ? (v as ThemeKey) : 'dark'
}
export function setTheme(theme: ThemeKey) {
  write('site_theme', theme)
  const root = document.documentElement
  root.classList.remove(...Object.keys(THEME_KEYS).map((k) => 'theme-' + k))
  root.classList.add('theme-' + theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_BG[theme])
}

export function setLangAndReload(lang: 'en' | 'ru') {
  write('site_lang', lang)
  location.reload()
}

export const userMotionOff = () => read('site_motion') === 'off'
export function systemReducedMotion(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
export function setMotionOff(off: boolean) {
  write('site_motion', off ? 'off' : null)
  if (off) document.documentElement.setAttribute('data-motion', 'off')
  else document.documentElement.removeAttribute('data-motion')
}

export const celebrationsEnabled = () => read('streak_celebrations_off') !== '1'
export const setCelebrationsEnabled = (on: boolean) => write('streak_celebrations_off', on ? null : '1')
