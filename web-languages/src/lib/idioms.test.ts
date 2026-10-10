import { describe, expect, it } from 'vitest'
import { IDIOMS, dayNumber, hasIdioms, idiomLangs, idiomOfDay, idiomToWord } from './idioms'
import { VOCAB_LANGS } from './vocab'

describe('подборка идиом (BACKLOG 44.7)', () => {
  it('языки подборки есть в списке языков словаря, в каждом ≥10 записей с текстом, русским и английским смыслом', () => {
    const known = new Set(VOCAB_LANGS.map((l) => l[0]))
    for (const lang of idiomLangs()) {
      expect(known.has(lang), lang).toBe(true)
      expect(IDIOMS[lang].length, lang).toBeGreaterThanOrEqual(10)
      for (const i of IDIOMS[lang]) {
        expect(i.text.trim(), lang).not.toBe('')
        expect(i.ru.trim(), i.text).not.toBe('')
        expect(i.en.trim(), i.text).not.toBe('')
      }
      expect(new Set(IDIOMS[lang].map((i) => i.text)).size, lang).toBe(IDIOMS[lang].length)
    }
  })
  it('идиома дня стабильна в течение дня, меняется на следующий день, «другая» листает по кругу', () => {
    const d = dayNumber(new Date(2026, 9, 10))
    expect(dayNumber(new Date(2026, 9, 11))).toBe(d + 1)
    expect(idiomOfDay('en', d)).toEqual(idiomOfDay('en', d))
    expect(idiomOfDay('en', d + 1)).not.toEqual(idiomOfDay('en', d))
    expect(idiomOfDay('en', d, 1)).toEqual(idiomOfDay('en', d + 1))
    const n = IDIOMS.en.length
    expect(idiomOfDay('en', d, n)).toEqual(idiomOfDay('en', d))
    expect(idiomOfDay('en', d, -1)).toEqual(idiomOfDay('en', d - 1))
    expect(idiomOfDay('ja', d)).toBeNull()
    expect(hasIdioms('de')).toBe(true)
    expect(hasIdioms('ja')).toBe(false)
  })
  it('в «мои слова»: перевод на язык интерфейса, пояснение — на другом', () => {
    const i = IDIOMS.de[0]
    expect(idiomToWord(i, 'ru')).toEqual({ word: i.text, translation: i.ru, example: i.en })
    expect(idiomToWord(i, 'en')).toEqual({ word: i.text, translation: i.en, example: i.ru })
  })
})
