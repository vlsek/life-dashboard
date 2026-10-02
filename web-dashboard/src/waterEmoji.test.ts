import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'
import { UI_EMOJI_TO_SVG, splitEmojiText } from './lib/emojiText'
import { ICON_PATHS } from './lib/icons'

// BACKLOG 🎨 «Эмодзи: вода и шапка» (Дашборд): в окне воды и подсказках стакана не должно остаться сырых 💧 ↶ ✎ ✓ —
// они идут через <EmojiText> (SVG) или вообще убраны из атрибутов title.
const tpl = (f: string): string => {
  const src: string = readFileSync(`src/components/${f}.vue`, 'utf-8')
  return src.slice(src.indexOf('<template>'))
}
const withoutEmojiText = (t: string) => t.replace(/<EmojiText[\s\S]*?\/>/g, '')

describe('вода: эмодзи → SVG (Дашборд)', () => {
  it('WaterModal: 💧 ↶ ✎ только внутри <EmojiText>, сырых нет (✓ — типографика, остаётся текстом по правилу KEEP)', () => {
    const t = tpl('WaterModal')
    const rest = withoutEmojiText(t)
    for (const g of ['💧', '↶', '✎']) {
      expect(t, g).toContain(g) // глифы остались — но только как текст для EmojiText
      expect(rest, g).not.toContain(g)
    }
  })

  it('глифы 💧 ↶ ✎ из окна воды EmojiText рисует как SVG; ✓ остаётся текстом', () => {
    for (const g of ['💧', '↶', '✎']) expect(splitEmojiText(`${g} текст`)[0].kind, g).toBe('icon')
    expect(splitEmojiText('✓ сохранено')[0].kind).toBe('text')
  })

  it('иконка undo существует и привязана к ↶', () => {
    expect(UI_EMOJI_TO_SVG['↶']).toBe('undo')
    expect((ICON_PATHS as Record<string, string>).undo).toContain('<path')
  })

  it('WaterModal импортирует EmojiText', () => {
    const src: string = readFileSync('src/components/WaterModal.vue', 'utf-8')
    expect(src.slice(0, src.indexOf('<template>'))).toContain("import EmojiText from './EmojiText.vue'")
  })

  it('WaterSection и WaterBadge: в подсказке title нет эмодзи (в атрибут SVG не вставить), числа и единицы на месте', () => {
    for (const f of ['WaterSection', 'WaterBadge']) {
      const t = tpl(f)
      expect(t, f).not.toContain('💧')
      expect(t, f).toMatch(/:title="`\$\{(todayMl|currentMl)\} \/ \$\{normMl\} \$\{unitLabel\}`"/)
    }
  })
})
