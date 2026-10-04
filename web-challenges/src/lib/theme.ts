// Портировано из theme.js — тот же localStorage-ключ и тот же список тем, чтобы
// переключение здесь совпадало с остальным сайтом (общий localStorage, общий домен).
export const THEME_KEYS = {
  dark: 'theme_dark',
  monet: 'theme_monet',
  light: 'theme_light',
  pink: 'theme_pink',
  mint: 'theme_mint',
  sepia: 'theme_sepia',
  solarlight: 'theme_solarlight',
  nord: 'theme_nord',
  mocha: 'theme_mocha',
  amoled: 'theme_amoled',
  contrast: 'theme_contrast',
} as const

export type ThemeKey = keyof typeof THEME_KEYS

const THEME_BG_COLORS: Record<ThemeKey, string> = {
  dark: '#121212',
  monet: '#0d0703',
  light: '#f7f4ef',
  pink: '#fff0f5',
  mint: '#effaf4',
  sepia: '#f4ecd8',
  solarlight: '#fdf6e3',
  nord: '#2e3440',
  mocha: '#1e1e2e',
  amoled: '#000000',
  contrast: '#000000',
}

export function getTheme(): ThemeKey {
  const v = localStorage.getItem('site_theme')
  return v && v in THEME_KEYS ? (v as ThemeKey) : 'dark'
}

export function setTheme(theme: ThemeKey) {
  localStorage.setItem('site_theme', theme)
  document.documentElement.classList.remove(...Object.keys(THEME_KEYS).map((k) => 'theme-' + k))
  document.documentElement.classList.add('theme-' + theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_BG_COLORS[theme])
}
