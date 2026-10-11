// Выбор заставки загрузки (BACKLOG 16, срез 2): те же ключи, что в Дашборде (web-dashboard/src/lib/splashVariants.ts) и в
// скрипте выбора каждой index.html: localStorage `splash_variant`, по умолчанию «живое пламя». Тот же origin у всех страниц сайта,
// поэтому выбор действует везде. Тест splashPicker.test.ts следит, чтобы список вариантов совпадал с Дашбордом.
import { THEME_LOADER } from './themeLoader'

export const SPLASH_VARIANTS = ['classic', 'flame', 'ring', 'tongues'] as const
export type SplashVariant = (typeof SPLASH_VARIANTS)[number]
export const DEFAULT_SPLASH_VARIANT: SplashVariant = 'flame'
export const SPLASH_VARIANT_KEY = 'splash_variant'

export const isSplashVariant = (v: unknown): v is SplashVariant => (SPLASH_VARIANTS as readonly unknown[]).includes(v)

// Заставка, идущая с большой темой (BACKLOG 55.5, срез 2): тема — из класса `theme-<ключ>` на <html> (его ставит скрипт каждой страницы до бандла)
function themeLoaderVariant(): SplashVariant | null {
  try {
    for (const c of Array.from(document.documentElement.classList)) {
      const m = /^theme-(\w+)$/.exec(c)
      const v = m ? THEME_LOADER[m[1]] : undefined
      if (v) return v
    }
  } catch {
    /* нет документа — тема не определяется */
  }
  return null
}

// Что выбрал пользователь: конкретный вариант или 'auto' («по теме»: ничего не сохранено)
export function readSplashChoice(): SplashVariant | 'auto' {
  try {
    const stored = localStorage.getItem(SPLASH_VARIANT_KEY)
    if (isSplashVariant(stored)) return stored
  } catch {
    /* нет localStorage — «по теме» */
  }
  return 'auto'
}

// Какая заставка играет: ручной выбор главнее, иначе заставка большой темы, иначе «живое пламя»
export function readSplashVariant(): SplashVariant {
  const c = readSplashChoice()
  return c === 'auto' ? (themeLoaderVariant() ?? DEFAULT_SPLASH_VARIANT) : c
}

// Возвращает true, если выбор удалось запомнить (в приватном режиме localStorage может быть недоступен).
// 'auto' («по теме») снимает ручной выбор; data-splash сразу показывает вариант, который теперь действует.
export function writeSplashVariant(v: SplashVariant | 'auto'): boolean {
  try {
    if (v === 'auto') localStorage.removeItem(SPLASH_VARIANT_KEY)
    else localStorage.setItem(SPLASH_VARIANT_KEY, v)
    document.documentElement.setAttribute('data-splash', readSplashVariant())
    return true
  } catch {
    return false
  }
}
