import { describe, expect, it } from 'vitest'
import appSource from './App.vue?raw'

// BACKLOG 576 (аудит оформления, обход стендом с данными): у активной вкладки категорий «Вех» цвет текста был акцентным, а фон не задан —
// глобальный `button` красит фон акцентом, и подпись «Все · N» становилась невидимой (акцент на акценте). Плюс колонки таблиц.
describe('Вехи: вкладки категорий и строки таблиц (аудит 576)', () => {
  const tab = /:style="effectiveCat === tab\.key \? '([^']*)' : '([^']*)'"/.exec(appSource)
  it('активная вкладка: фон акцента + цвет текста на акценте (не акцент на акценте); неактивная — прозрачная', () => {
    expect(tab).not.toBeNull()
    const [, on, off] = tab!
    expect(on).toContain('background: var(--accent)')
    expect(on).toContain('color: var(--accent-text)')
    expect(on).not.toMatch(/(^|;\s*)color: var\(--accent\)/)
    expect(off).toContain('background: transparent')
  })
  it('в списках вех — карточки: название занимает свободное место, кнопки действий компактные, у активных — круглая «✓» и полоса статуса', () => {
    const cards = [...appSource.matchAll(/<li\s+v-for="m in (?:list|done)"([\s\S]*?)<\/li>/g)].map((m) => m[1])
    expect(cards).toHaveLength(2)
    for (const c of cards) {
      expect(c).toMatch(/class="min-w-0 flex-1"/)
      expect(c).toContain('class="secondary px-2"')
      expect(c).toContain('class="danger px-2"')
    }
    expect(cards[0]).toContain("borderLeft: '4px solid '")
    expect(cards[0]).toMatch(/rounded-full[^>]*style="width: 40px; height: 40px"/)
  })
})
