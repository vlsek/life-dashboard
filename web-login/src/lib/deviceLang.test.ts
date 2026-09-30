import { beforeEach, describe, expect, it } from 'vitest'
import { applyDeviceLangIfUnset, detectDeviceLang, getLang } from './i18n'

describe('device language on first visit (BACKLOG 13)', () => {
  beforeEach(() => localStorage.clear())

  it('picks the first supported language in the device preference order', () => {
    expect(detectDeviceLang(['ru-RU', 'en-US'])).toBe('ru')
    expect(detectDeviceLang(['en-GB', 'ru'])).toBe('en')
    expect(detectDeviceLang(['de-DE', 'ru'])).toBe('ru')
    expect(detectDeviceLang(['ru_RU'])).toBe('ru')
    expect(detectDeviceLang(['RU'])).toBe('ru')
  })

  it('falls back to English when no supported language is present', () => {
    expect(detectDeviceLang(['de-DE', 'fr'])).toBe('en')
    expect(detectDeviceLang([])).toBe('en')
    expect(detectDeviceLang([''])).toBe('en')
  })

  it('saves the device language on the first visit so every page shows it', () => {
    applyDeviceLangIfUnset(['ru-RU'])
    expect(localStorage.getItem('site_lang')).toBe('ru')
    expect(getLang()).toBe('ru')
  })

  it('never overwrites a language the user already chose', () => {
    localStorage.setItem('site_lang', 'en')
    applyDeviceLangIfUnset(['ru-RU'])
    expect(localStorage.getItem('site_lang')).toBe('en')
    localStorage.setItem('site_lang', 'ru')
    applyDeviceLangIfUnset(['en-US'])
    expect(localStorage.getItem('site_lang')).toBe('ru')
  })
})
