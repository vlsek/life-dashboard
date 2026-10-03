import { describe, expect, it } from 'vitest'
import { suggestionsFor } from './skills'
import { splitEmojiText } from './emojiText'

// BACKLOG «Эмодзи в данных-пресетах»: иконка каждого предложенного навыка рисуется через EmojiText как SVG (в базу по-прежнему пишется эмодзи).
describe('пресеты навыков: у каждой иконки есть SVG', () => {
  for (const lang of ['ru', 'en'] as const) {
    it(`язык ${lang}: каждая иконка пресета превращается в иконку`, () => {
      const list = suggestionsFor(lang, new Set())
      expect(list.length).toBeGreaterThan(0)
      for (const s of list) {
        const segs = splitEmojiText(s.icon)
        expect(segs.length, s.name).toBeGreaterThan(0)
        expect(segs.every((x) => x.kind === 'icon'), `${s.name}: ${s.icon}`).toBe(true)
      }
    })
  }
})
