// Выбор заставки загрузки (BACKLOG 16, срез 2): те же ключи, что в Дашборде (web-dashboard/src/lib/splashVariants.ts) и в
// скрипте выбора каждой index.html: localStorage `splash_variant`, по умолчанию «живое пламя». Тот же origin у всех страниц сайта,
// поэтому выбор действует везде. Тест splashPicker.test.ts следит, чтобы список вариантов совпадал с Дашбордом.
export const SPLASH_VARIANTS = ['classic', 'flame', 'ring', 'tongues'] as const
export type SplashVariant = (typeof SPLASH_VARIANTS)[number]
export const DEFAULT_SPLASH_VARIANT: SplashVariant = 'flame'
export const SPLASH_VARIANT_KEY = 'splash_variant'

export const isSplashVariant = (v: unknown): v is SplashVariant => (SPLASH_VARIANTS as readonly unknown[]).includes(v)

export function readSplashVariant(): SplashVariant {
  try {
    const stored = localStorage.getItem(SPLASH_VARIANT_KEY)
    if (isSplashVariant(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_SPLASH_VARIANT
}

// Возвращает true, если выбор удалось запомнить (в приватном режиме localStorage может быть недоступен).
export function writeSplashVariant(v: SplashVariant): boolean {
  try {
    localStorage.setItem(SPLASH_VARIANT_KEY, v)
    document.documentElement.setAttribute('data-splash', v)
    return true
  } catch {
    return false
  }
}
