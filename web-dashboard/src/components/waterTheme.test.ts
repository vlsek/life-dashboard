// @ts-ignore — в проекте нет типов node; vitest выполняется в node, а ?raw для .css в vitest отдаёт пустую строку.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 12: вода в стакане всегда голубая/синяя, оттенок — свой у каждой темы, читается на фоне карточки.
const css: string = readFileSync('src/style.css', 'utf-8') // vitest запускается из папки web-dashboard/
const THEMES = ['dark', 'monet', 'light', 'pink'] as const

function block(theme: string): string {
  const m = css.match(new RegExp(`html\\.theme-${theme} \\{([^}]*)\\}`))
  if (!m) throw new Error('no theme block ' + theme)
  return m[1]
}
const tok = (b: string, name: string): string => {
  const m = b.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error('no token ' + name)
  return m[1]
}
function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const isBlue = (hex: string): boolean => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return b > r + 40 && b >= g
}

describe('water colors per theme', () => {
  for (const theme of THEMES) {
    it(`${theme}: blue tokens with contrast >= 3:1 against the card`, () => {
      const b = block(theme)
      const card = tok(b, 'bg-card')
      for (const name of ['water-top', 'water-bottom', 'water-line']) {
        const v = tok(b, name)
        expect(isBlue(v), `${theme} ${name} ${v} should be blue`).toBe(true)
        expect(contrast(v, card), `${theme} ${name}`).toBeGreaterThanOrEqual(3)
      }
    })
  }

  it('themes do not all share one shade (each theme has its own)', () => {
    const shades = new Set(THEMES.map((t) => tok(block(t), 'water-bottom')))
    expect(shades.size).toBeGreaterThan(2)
  })

  it('water components use the water tokens, not the theme accent', () => {
    for (const f of ['WaterBadge', 'WaterSection', 'WaterSavedAnim']) {
      const src: string = readFileSync(`src/components/${f}.vue`, 'utf-8')
      expect(src, f).toContain('var(--water-')
      expect(src, f).not.toContain('var(--accent)')
      expect(src, f).not.toContain('#3b9ee5')
    }
  })
})
