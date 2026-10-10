import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SPLASH_VARIANT,
  SPLASH_VARIANTS,
  SPLASH_VARIANT_KEY,
  SPLASH_VARIANT_LABEL_KEYS,
  isSplashVariant,
  readSplashVariant,
} from './lib/splashVariants'
import { t } from './lib/i18n'

describe('splashVariants: реестр', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('четыре варианта; старая «классика» и «три языка» на месте; по умолчанию — «живое пламя»', () => {
    expect([...SPLASH_VARIANTS]).toEqual(['classic', 'flame', 'ring', 'tongues'])
    expect(DEFAULT_SPLASH_VARIANT).toBe('flame')
  })

  it('у каждого варианта есть подпись в RU и EN (для будущей «Кастомизации»)', () => {
    for (const v of SPLASH_VARIANTS) {
      localStorage.setItem('site_lang', 'ru')
      const ru = t(SPLASH_VARIANT_LABEL_KEYS[v])
      localStorage.setItem('site_lang', 'en')
      const en = t(SPLASH_VARIANT_LABEL_KEYS[v])
      expect(ru).not.toBe(SPLASH_VARIANT_LABEL_KEYS[v])
      expect(en).not.toBe(SPLASH_VARIANT_LABEL_KEYS[v])
      expect(ru).not.toBe(en)
    }
  })

  it('isSplashVariant принимает только известные ключи', () => {
    expect(isSplashVariant('ring')).toBe(true)
    expect(isSplashVariant('tongues')).toBe(true)
    for (const bad of ['', 'Ring', 'fire', null, undefined, 1]) expect(isSplashVariant(bad)).toBe(false)
  })

  it('readSplashVariant: по умолчанию flame; из хранилища; мусор игнорируется', () => {
    expect(readSplashVariant('')).toBe('flame')
    localStorage.setItem(SPLASH_VARIANT_KEY, 'classic')
    expect(readSplashVariant('')).toBe('classic')
    localStorage.setItem(SPLASH_VARIANT_KEY, 'nonsense')
    expect(readSplashVariant('')).toBe('flame')
  })

  it('?splash= в адресе главнее хранилища и запоминается; неверное значение в адресе игнорируется', () => {
    localStorage.setItem(SPLASH_VARIANT_KEY, 'classic')
    expect(readSplashVariant('?splash=ring')).toBe('ring')
    expect(localStorage.getItem(SPLASH_VARIANT_KEY)).toBe('ring')
    expect(readSplashVariant('?splash=zzz')).toBe('ring') // осталось запомненное
    expect(readSplashVariant('?x=1&splash=flame')).toBe('flame')
  })
})
