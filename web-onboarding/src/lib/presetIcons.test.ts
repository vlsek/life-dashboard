import { describe, expect, it } from 'vitest'
import { baseMetrics, goalMetrics, goalOptions, starterMetrics } from './onboardingData'
import { splitEmojiText } from './emojiText'

// BACKLOG «Эмодзи в данных-пресетах»: иконка каждой метрики-подсказки в онбординге рисуется через EmojiText как SVG.
describe('онбординг: у каждой иконки метрики-подсказки есть SVG', () => {
  for (const lang of ['ru', 'en'] as const) {
    it(`язык ${lang}: базовые, стартовые и целевые метрики`, () => {
      const all = [...baseMetrics(lang), ...starterMetrics(lang), ...goalOptions(lang).flatMap((g) => goalMetrics(lang, g.value))]
      expect(all.length).toBeGreaterThan(5)
      for (const m of all) {
        if (!m.icon) continue
        const segs = splitEmojiText(m.icon)
        expect(segs.every((s) => s.kind === 'icon'), `${m.key}: ${m.icon}`).toBe(true)
      }
    })
  }
})
