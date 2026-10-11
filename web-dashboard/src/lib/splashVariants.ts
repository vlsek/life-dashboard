// Варианты заставки загрузки (BACKLOG 16, «огонёк при загрузке», 14:02/15:11/19:06): единый реестр —
// из него потом возьмутся пункты раздела «Кастомизация» и товары магазина (раздел 15). Старые варианты
// не удаляем (просьба владельца): «классика» (v1.70) осталась как есть, а старое пламя из трёх языков вернулось
// вариантом «tongues» (тот самый, что был до «живого пламени»).
import type { DictKey } from './i18n'
import { THEME_LOADER } from './themeLoader'

export const SPLASH_VARIANTS = ['classic', 'flame', 'ring', 'tongues'] as const
export type SplashVariant = (typeof SPLASH_VARIANTS)[number]

// По умолчанию — «живое пламя» (владелец просил «чтобы прям горело»); меняется на решение владельца.
export const DEFAULT_SPLASH_VARIANT: SplashVariant = 'flame'
export const SPLASH_VARIANT_KEY = 'splash_variant'

export const SPLASH_VARIANT_LABEL_KEYS: Record<SplashVariant, DictKey> = {
  classic: 'splash_variant_classic',
  flame: 'splash_variant_flame',
  ring: 'splash_variant_ring',
  tongues: 'splash_variant_tongues',
}

export function isSplashVariant(v: unknown): v is SplashVariant {
  return (SPLASH_VARIANTS as readonly unknown[]).includes(v)
}

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

// Выбор: `?splash=ring` в адресе (для предпросмотра, запоминается) → localStorage → заставка большой темы (55.5) → по умолчанию.
// Мусор в адресе/хранилище игнорируется. Та же логика продублирована коротким скриптом в index.html,
// чтобы статичная заставка до загрузки бандла показывала тот же вариант (проверяется тестом).
export function readSplashVariant(search: string = typeof location !== 'undefined' ? location.search : ''): SplashVariant {
  try {
    const fromUrl = new URLSearchParams(search).get('splash')
    if (isSplashVariant(fromUrl)) {
      try {
        localStorage.setItem(SPLASH_VARIANT_KEY, fromUrl)
      } catch {
        /* приватный режим — просто не запоминаем */
      }
      return fromUrl
    }
    const stored = localStorage.getItem(SPLASH_VARIANT_KEY)
    if (isSplashVariant(stored)) return stored
  } catch {
    /* нет localStorage — берём вариант темы или по умолчанию */
  }
  return themeLoaderVariant() ?? DEFAULT_SPLASH_VARIANT // не выбрано вручную: заставка большой темы, иначе «живое пламя»
}
