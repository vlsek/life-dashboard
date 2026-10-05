// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в themes.test.ts).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { THEME_KEYS } from './lib/theme'
import { NONE_COLOR, OTHER_COLOR, VARIATION_PALETTE, chartVar, colorFor } from './lib/variationChart'

// BACKLOG 13:55: цвета диаграмм особенностей подхода — по теме оформления. Палитры задаёт scripts/themes_data.py (chart_palette),
// сюда они попадают токенами --chart-1…8, --chart-none, --chart-other в блоке каждой темы.
const css: string = readFileSync('src/style.css', 'utf-8')
const KEYS = Object.keys(THEME_KEYS)

function vars(theme: string): Record<string, string> {
  const m = css.match(new RegExp(`html\\.theme-${theme} \\{([^}]*)\\}`))
  if (!m) throw new Error('no theme block ' + theme)
  const out: Record<string, string> = {}
  for (const [, k, v] of m[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/g)) out[k] = v
  return out
}
const rgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
function lum(hex: string): number {
  const c = rgb(hex).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
function lab(hex: string): number[] {
  const c = rgb(hex).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const X = (0.4124 * c[0] + 0.3576 * c[1] + 0.1805 * c[2]) / 0.95047
  const Y = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  const Z = (0.0193 * c[0] + 0.1192 * c[1] + 0.9505 * c[2]) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]
}
const dE = (a: string, b: string): number => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]))
const slots = (v: Record<string, string>): string[] => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v[`chart-${i}`])

describe('цвета диаграмм по теме: токены', () => {
  it.each(KEYS)('%s: есть --chart-1…8, --chart-none и --chart-other', (theme) => {
    const v = vars(theme)
    for (const s of slots(v)) expect(s, theme).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(v['chart-none']).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(v['chart-other']).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it.each(KEYS)('%s: первая особенность — оттенок акцента темы (тот же тон), остальные восемь цветов не повторяются', (theme) => {
    const v = vars(theme)
    const s = slots(v)
    expect(new Set(s).size).toBe(8)
    // первая — сам акцент либо его чуть затемнённая/осветлённая копия для контраста с карточкой
    expect(dE(s[0], v['accent']), `${theme} chart-1 vs accent`).toBeLessThan(30) // у розовой акцент затемнён, чтобы читаться на розовой карточке
    if (contrast(v['accent'], v['bg-card']) >= 3.2) expect(s[0]).toBe(v['accent'])
  })

  it.each(KEYS)('%s: каждый цвет читается на карточке темы (контраст ≥ 3:1)', (theme) => {
    const v = vars(theme)
    for (const c of [...slots(v), v['chart-none'], v['chart-other']]) {
      expect(contrast(c, v['bg-card']), `${theme} ${c}`).toBeGreaterThanOrEqual(2.95)
    }
  })

  it.each(KEYS)('%s: цвета различимы — первые четыре заметно, любые два из восьми не сливаются (ΔE CIE76)', (theme) => {
    const s = slots(vars(theme))
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(dE(s[i], s[j]), `${theme} ${i + 1}/${j + 1}`).toBeGreaterThanOrEqual(25)
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) expect(dE(s[i], s[j]), `${theme} ${i + 1}/${j + 1}`).toBeGreaterThanOrEqual(12)
  })

  it.each(KEYS)('%s: «без особенности» и «остальные» — нейтральные серые, не сливаются с цветными', (theme) => {
    const v = vars(theme)
    const chroma = (hex: string) => Math.hypot(lab(hex)[1], lab(hex)[2])
    expect(chroma(v['chart-none'])).toBeLessThan(12)
    expect(chroma(v['chart-other'])).toBeLessThan(12)
    for (const g of [v['chart-none'], v['chart-other']]) for (const c of slots(v)) expect(dE(g, c), `${theme} ${g} vs ${c}`).toBeGreaterThanOrEqual(15)
  })

  it('палитры разных тем действительно разные: у светлой и тёмной не совпадают цвета', () => {
    expect(slots(vars('dark'))).not.toEqual(slots(vars('light')))
    expect(slots(vars('mint'))[0]).toBe('#13805a')
    expect(slots(vars('amoled'))[0]).toBe('#4ea1ff')
  })
})

describe('colorFor отдаёт токены темы с запасным цветом', () => {
  const order = ['a', 'b', 'c']
  it('особенности — var(--chart-N, запасной), стабильно по порядку', () => {
    expect(colorFor('a', order)).toBe('var(--chart-1, #3b82f6)')
    expect(colorFor('b', order)).toBe(chartVar(1))
    expect(colorFor('c', order)).toBe('var(--chart-3, #f59e0b)')
    expect(VARIATION_PALETTE).toHaveLength(8)
  })
  it('«без особенности» и «остальные» — свои токены', () => {
    expect(colorFor(null, order)).toBe(NONE_COLOR)
    expect(NONE_COLOR).toBe('var(--chart-none, #9aa0a6)')
    expect(colorFor('missing', order)).toBe(OTHER_COLOR)
    expect(OTHER_COLOR).toBe('var(--chart-other, #6b7280)')
  })
  it('цвет можно подставить в атрибут и стиль без кавычек (не ломает SVG-строку)', () => {
    for (const c of [colorFor('a', order), NONE_COLOR, OTHER_COLOR]) expect(c).not.toMatch(/["'<>]/)
  })
  it('в style.css каждая тема задаёт токены, на которые ссылается colorFor', () => {
    for (let i = 1; i <= 8; i++) expect(css).toContain(`--chart-${i}:`)
    expect(css).toContain('--chart-none:')
    expect(css).toContain('--chart-other:')
  })
})
