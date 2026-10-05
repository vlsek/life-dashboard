// Генерируется scripts/apply_themes.py из scripts/themes_data.py — не править руками.
// Цвета для превью темы в «Кастомизации» (мини-диаграмма): фон страницы, карточка, акцент, текст, успех и вода.
import type { ThemeKey } from './theme'

export interface ThemePreview {
  bg: string
  card: string
  accent: string
  text: string
  success: string
  water: string
  kind: 'dark' | 'light'
}

export const THEME_PREVIEW: Record<ThemeKey, ThemePreview> = {
  dark: { bg: '#121212', card: '#1e1e1e', accent: '#5b8def', text: '#e6e6e6', success: '#4caf6a', water: '#63b3f5', kind: 'dark' },
  monet: { bg: '#0d0703', card: '#1c1108', accent: '#f2a93c', text: '#f2cf9e', success: '#8fbf5a', water: '#63b3f5', kind: 'dark' },
  light: { bg: '#f7f4ef', card: '#ffffff', accent: '#d97f2a', text: '#2b2118', success: '#4c9a5f', water: '#3f95e0', kind: 'light' },
  pink: { bg: '#fff0f5', card: '#ffe2ec', accent: '#ff4f81', text: '#5c1a33', success: '#4c9a5f', water: '#3184d6', kind: 'light' },
  mint: { bg: '#effaf4', card: '#ffffff', accent: '#13805a', text: '#17392b', success: '#2b7d4f', water: '#3f95e0', kind: 'light' },
  sepia: { bg: '#f4ecd8', card: '#fbf5e6', accent: '#9a5b13', text: '#433422', success: '#4f7d34', water: '#3589d6', kind: 'light' },
  solarlight: { bg: '#fdf6e3', card: '#eee8d5', accent: '#1d6fa8', text: '#33474f', success: '#6b7a00', water: '#2f7fcf', kind: 'light' },
  nord: { bg: '#2e3440', card: '#3b4252', accent: '#88c0d0', text: '#eceff4', success: '#a3be8c', water: '#7cc4ff', kind: 'dark' },
  mocha: { bg: '#1e1e2e', card: '#313244', accent: '#cba6f7', text: '#cdd6f4', success: '#a6e3a1', water: '#63b3f5', kind: 'dark' },
  amoled: { bg: '#000000', card: '#0d0d0d', accent: '#4ea1ff', text: '#f2f2f2', success: '#4caf6a', water: '#63b3f5', kind: 'dark' },
  contrast: { bg: '#000000', card: '#0a0a0a', accent: '#ffd60a', text: '#ffffff', success: '#5cff8a', water: '#63b3f5', kind: 'dark' },
}
