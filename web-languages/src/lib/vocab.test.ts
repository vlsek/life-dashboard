import { afterEach, describe, expect, it, vi } from 'vitest'
import { autoTranslate, getLangFilter, getLastLang, langName, setLangFilter, setLastLang, translationTarget, VOCAB_LANGS, addableLangs, buildTabs, getSavedTabs, resolveActiveTab, setSavedTabs } from './vocab'

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

describe('dictionary tabs (BACKLOG 14)', () => {
  afterEach(() => localStorage.clear())

  it('builds one tab per language with words, biggest dictionary first, null lang counts as English', () => {
    const tabs = buildTabs([{ lang: 'de' }, { lang: 'de' }, { lang: null }, { lang: 'fr' }, { lang: 'de' }], [])
    expect(tabs.map((t) => [t.code, t.count])).toEqual([['de', 3], ['en', 1], ['fr', 1]])
    expect(tabs[0].label).toBe('Deutsch')
  })

  it('keeps the saved order (it does not jump when counts change) and appends new languages at the end', () => {
    const words = [{ lang: 'en' }, { lang: 'de' }, { lang: 'de' }, { lang: 'de' }, { lang: 'ja' }]
    expect(buildTabs(words, ['en', 'de']).map((t) => t.code)).toEqual(['en', 'de', 'ja'])
  })

  it('keeps an empty dictionary that was created but has no words yet', () => {
    const tabs = buildTabs([{ lang: 'en' }], ['en', 'es'])
    expect(tabs.map((t) => [t.code, t.count])).toEqual([['en', 1], ['es', 0]])
  })

  it('saved tabs round-trip through localStorage and ignore garbage', () => {
    expect(getSavedTabs()).toEqual([])
    setSavedTabs(['en', 'de', 'de'])
    expect(getSavedTabs()).toEqual(['en', 'de'])
    localStorage.setItem('vocab_tabs', '{"not":"an array"}')
    expect(getSavedTabs()).toEqual([])
    localStorage.setItem('vocab_tabs', '[1, null, "fr"]')
    expect(getSavedTabs()).toEqual(['fr'])
    localStorage.setItem('vocab_tabs', 'not json')
    expect(getSavedTabs()).toEqual([])
  })

  it('resolves the open tab: the stored one if it still exists, the only dictionary by itself, else "all"', () => {
    const two = buildTabs([{ lang: 'en' }, { lang: 'de' }], [])
    expect(resolveActiveTab('de', two)).toBe('de')
    expect(resolveActiveTab('fr', two)).toBe('all')
    expect(resolveActiveTab('all', two)).toBe('all')
    const one = buildTabs([{ lang: 'en' }], [])
    expect(resolveActiveTab('all', one)).toBe('en')
    expect(resolveActiveTab('all', [])).toBe('all')
  })

  it('offers only languages that do not have a dictionary yet', () => {
    const tabs = buildTabs([{ lang: 'en' }, { lang: 'de' }], [])
    const codes = addableLangs(tabs).map(([c]) => c)
    expect(codes).not.toContain('en')
    expect(codes).not.toContain('de')
    expect(codes).toContain('fr')
  })
})
