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
  it('в таблицах название занимает свободное место, кнопки — узкая колонка; кнопки действий компактные', () => {
    const rows = [...appSource.matchAll(/<tr v-for="m in (?:list|done)" :key="m\.id" class="align-top">([\s\S]*?)<\/tr>/g)].map((m) => m[1])
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      expect(r).toMatch(/<td class="[^"]*w-full[^"]*">/)
      expect(r).toMatch(/<td class="w-px py-1\.5 pl-2 text-right whitespace-nowrap">/)
      expect(r).toContain('class="secondary px-2"')
      expect(r).toContain('class="danger px-2"')
    }
  })
})
