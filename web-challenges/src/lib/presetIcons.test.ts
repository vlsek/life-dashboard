import { describe, expect, it } from 'vitest'
import { challengeTemplates } from './templates'
import { setLang } from './i18n'
import { splitEmojiText } from './emojiText'

// BACKLOG «Эмодзи в данных-пресетах»: иконка каждого шаблона челленджа рисуется через EmojiText как SVG (данные остаются эмодзи).
describe('шаблоны челленджей: у каждой иконки есть SVG', () => {
  for (const lang of ['ru', 'en'] as const) {
    it(`язык ${lang}: каждая иконка шаблона превращается в иконку, а не остаётся эмодзи-текстом`, () => {
      setLang(lang)
      const list = challengeTemplates()
      expect(list.length).toBeGreaterThan(0)
      for (const tpl of list) {
        const segs = splitEmojiText(tpl.icon)
        expect(segs.some((s) => s.kind === 'icon'), `${tpl.id}: ${tpl.icon}`).toBe(true)
        expect(segs.every((s) => s.kind === 'icon'), `${tpl.id}: остался текст рядом с иконкой`).toBe(true)
      }
    })
  }
})
