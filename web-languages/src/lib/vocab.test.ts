import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  autoTranslate,
  getLangFilter,
  getLastLang,
  langName,
  setLangFilter,
  setLastLang,
  translationTarget,
  VOCAB_LANGS,
} from './vocab'

describe('langName', () => {
  it('resolves a known code to its native name', () => {
    expect(langName('de')).toBe('Deutsch')
    expect(langName('ja')).toBe('日本語')
  })
  it('falls back to the uppercased code for an unknown language', () => {
    expect(langName('xx')).toBe('XX')
  })
  it('has all 20 languages from english.js', () => {
    expect(VOCAB_LANGS.length).toBe(20)
  })
})

describe('translationTarget', () => {
  it('targets the interface language by default', () => {
    expect(translationTarget('en', 'ru')).toBe('ru')
    expect(translationTarget('de', 'en')).toBe('en')
  })
  it('falls back to English when learning the interface language itself', () => {
    expect(translationTarget('ru', 'ru')).toBe('en')
    expect(translationTarget('en', 'en')).toBe('en')
  })
})

describe('lang filter / last-lang localStorage', () => {
  afterEach(() => localStorage.clear())

  it('defaults to "all" and "en" when nothing stored', () => {
    expect(getLangFilter()).toBe('all')
    expect(getLastLang()).toBe('en')
  })
  it('round-trips through localStorage', () => {
    setLangFilter('de')
    expect(getLangFilter()).toBe('de')
    setLastLang('ja')
    expect(getLastLang()).toBe('ja')
  })
})

describe('autoTranslate', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns the translated text on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ responseData: { translatedText: 'Hallo' } }),
      }),
    )
    expect(await autoTranslate('Hello', 'en', 'de')).toBe('Hallo')
  })

  it('returns null on a fake "NO QUERY SPECIFIED" style error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ responseData: { translatedText: 'NO QUERY SPECIFIED' } }),
      }),
    )
    expect(await autoTranslate('Hello')).toBeNull()
  })

  it('returns null on a non-ok response or network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await autoTranslate('Hello')).toBeNull()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    )
    expect(await autoTranslate('Hello')).toBeNull()
  })

  it('returns null for empty/blank input without calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await autoTranslate('   ')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
