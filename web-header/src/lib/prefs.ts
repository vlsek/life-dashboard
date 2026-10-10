import { ref } from 'vue'

// Мелкие пользовательские настройки, которые живут в localStorage и применяются сразу. Ключи и поведение — те же, что
// в пилотах (чтобы глобальные настройки и настройки на страницах не расходились):
//   site_lang (язык; смена перезагружает страницу), site_theme (+ классы theme-* на <html>), site_motion = 'off'
//   (<html data-motion="off">, BACKLOG 16), streak_celebrations_off = '1' (поздравления за серии, BACKLOG 13),
//   water_reminders_off = '1' (напоминание выпить воду при открытии, BACKLOG 18.5; читает Дашборд — lib/waterReminder.ts).
export const THEME_KEYS = { dark: 'theme_dark', monet: 'theme_monet', light: 'theme_light', pink: 'theme_pink', mint: 'theme_mint', sepia: 'theme_sepia', solarlight: 'theme_solarlight', nord: 'theme_nord', mocha: 'theme_mocha', amoled: 'theme_amoled', contrast: 'theme_contrast', dracula: 'theme_dracula', gruvbox: 'theme_gruvbox', tokyonight: 'theme_tokyonight', forest: 'theme_forest', ocean: 'theme_ocean', sunset: 'theme_sunset', twilight: 'theme_twilight', neon: 'theme_neon', lavender: 'theme_lavender', sky: 'theme_sky', peach: 'theme_peach', graphite: 'theme_graphite', emerald: 'theme_emerald', moonlight: 'theme_moonlight' } as const
export type ThemeKey = keyof typeof THEME_KEYS

const THEME_BG: Record<ThemeKey, string> = { dark: '#121212', monet: '#0d0703', light: '#f7f4ef', pink: '#fff0f5', mint: '#effaf4', sepia: '#f4ecd8', solarlight: '#fdf6e3', nord: '#2e3440', mocha: '#1e1e2e', amoled: '#000000', contrast: '#000000', dracula: '#282a36', gruvbox: '#282828', tokyonight: '#1a1b26', forest: '#0f1a14', ocean: '#0a1622', sunset: '#1c1014', twilight: '#150f25', neon: '#0b0f14', lavender: '#f5f0ff', sky: '#eef6fd', peach: '#fff3ea', graphite: '#eceff1', emerald: '#0b0f12', moonlight: '#0d081e' }

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
  return v && v in THEME_KEYS ? (v as ThemeKey) : 'light'
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

// Окно «вчерашние невыполненные» утром (BACKLOG 47.3): ключ читает Дашборд (web-dashboard/lib/skipYesterday.ts, SKIP_OFF_KEY) — менять только вместе
export const skipPromptEnabled = () => read('skip_prompt_off') !== '1'
export const setSkipPromptEnabled = (on: boolean) => write('skip_prompt_off', on ? null : '1')

export const waterRemindersEnabled = () => read('water_reminders_off') !== '1'
export const setWaterRemindersEnabled = (on: boolean) => write('water_reminders_off', on ? null : '1')

// Прогресс дня/недели в верхней части левого меню (BACKLOG 2.3 «Перенос в меню») — опция, по умолчанию выключена.
// Ключ localStorage `sidebar_progress` = '1'. Реактивная ссылка общая для окна настроек и блока в меню.
export const SIDEBAR_PROGRESS_KEY = 'sidebar_progress'
export const sidebarProgress = ref(read(SIDEBAR_PROGRESS_KEY) === '1')
export function setSidebarProgress(on: boolean) {
  sidebarProgress.value = on
  write(SIDEBAR_PROGRESS_KEY, on ? '1' : null)
}
