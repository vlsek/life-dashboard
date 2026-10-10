// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в waterTheme.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { THEME_KEYS } from './lib/theme'

// BACKLOG 11:49: Mint + набор тем (ответ владельца 2026-10-04: сразу набор на выбор). Источник правды — scripts/themes_data.py,
// раскатка — scripts/apply_themes.py. Здесь проверяем результат: полный набор переменных, контраст (WCAG) и одинаковость во всех пилотах.
const read = (p: string): string => readFileSync('../' + p, 'utf-8')
const OLD = ['dark', 'monet', 'light', 'pink']
// BACKLOG 45.4: к исходным одиннадцати добавлены ещё двенадцать тем (8 тёмных и 4 светлых), открытых всегда
const NEW = ['mint', 'sepia', 'solarlight', 'nord', 'mocha', 'amoled', 'contrast', 'dracula', 'gruvbox', 'tokyonight', 'forest', 'ocean', 'sunset', 'twilight', 'neon', 'lavender', 'sky', 'peach', 'graphite', 'emerald']
const KEYS = Object.keys(THEME_KEYS)
const css = read('web-dashboard/src/style.css')

function vars(theme: string): Record<string, string> {
  const m = css.match(new RegExp(`html\\.theme-${theme} \\{([^}]*)\\}`))
  if (!m) throw new Error('no theme block ' + theme)
  const out: Record<string, string> = {}
  for (const [, k, v] of m[1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6});/g)) out[k] = v
  return out
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
const pilots: string[] = readdirSync('..').filter((d: string) => d.startsWith('web-') && existsSync(`../${d}/src/lib/theme.ts`))

describe('набор тем', () => {
  it('24 темы: четыре прежних первыми, потом Mint, классика, двенадцать новых и первая «большая» (Emerald Obsidian)', () => {
    expect(KEYS).toEqual([...OLD, ...NEW])
    expect(Object.values(THEME_KEYS)).toEqual(KEYS.map((k) => 'theme_' + k))
  })

  it.each(KEYS)('%s: есть весь набор переменных', (theme) => {
    const v = vars(theme)
    for (const name of ['bg', 'bg-card', 'border', 'text', 'text-dim', 'accent', 'accent-text', 'success', 'danger', 'hist-ok', 'water-top', 'water-bottom', 'water-line']) {
      expect(v[name], `${theme} --${name}`).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it.each(NEW)('%s: контраст текста, акцента и воды читаемый (WCAG)', (theme) => {
    const v = vars(theme)
    const strong = theme === 'contrast' ? 7 : 4.5
    expect(contrast(v['text'], v['bg']), 'text/bg').toBeGreaterThanOrEqual(strong)
    expect(contrast(v['text'], v['bg-card']), 'text/card').toBeGreaterThanOrEqual(strong)
    expect(contrast(v['text-dim'], v['bg-card']), 'dim/card').toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4)
    expect(contrast(v['accent-text'], v['accent']), 'accent-text/accent').toBeGreaterThanOrEqual(strong)
    expect(contrast(v['accent'], v['bg-card']), 'accent/card').toBeGreaterThanOrEqual(3)
    expect(contrast(v['success'], v['bg-card']), 'success/card').toBeGreaterThanOrEqual(3)
    expect(contrast(v['danger'], v['bg-card']), 'danger/card').toBeGreaterThanOrEqual(3)
    for (const name of ['water-top', 'water-bottom', 'water-line']) {
      expect(isBlue(v[name]), `${theme} ${name} должна быть голубой`).toBe(true)
      expect(contrast(v[name], v['bg-card']), `${theme} ${name}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('Mint — светло-зелёная: фон светлый, акцент зелёный', () => {
    const v = vars('mint')
    expect(lum(v['bg'])).toBeGreaterThan(0.8)
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(v['accent'].slice(i, i + 2), 16))
    expect(g).toBeGreaterThan(r + 40)
    expect(g).toBeGreaterThan(b)
  })

  it('AMOLED — чисто чёрный фон; «высокий контраст» — белая граница', () => {
    expect(vars('amoled')['bg']).toBe('#000000')
    expect(vars('contrast')['border']).toBe('#ffffff')
  })

  it('золото стакана: яркое на тёмных темах, тёмное на светлых', () => {
    const dark = ['dark', 'monet', 'nord', 'mocha', 'amoled', 'contrast']
    const light = ['light', 'pink', 'mint', 'sepia', 'solarlight']
    for (const k of dark) expect(css, k).toMatch(new RegExp(`html\\.theme-${k}[,\\s][^}]*--water-gold: #f0b429`))
    for (const k of light) expect(css, k).toMatch(new RegExp(`html\\.theme-${k}[,\\s][^}]*--water-gold: #b87900`))
  })
})

describe('одинаково во всех пилотах', () => {
  const region = (t: string): string => t.slice(t.indexOf('/* themes:start'), t.indexOf('/* themes:end */'))

  it('нашлись все пилоты', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(16)
  })

  it.each(pilots)('%s: theme.ts, блоки тем, подписи и карты цветов', (dir: string) => {
    // web-login намеренно добавляет СВОЙ список LOGIN_THEMES (49.8: на входе только светлая/тёмная) — он не часть общей копии
    const ts = read(`${dir}/src/lib/theme.ts`).replace(/\/\/ На странице входа[^\n]*\nexport const LOGIN_THEMES[^\n]*\n\n?/, '')
    expect(ts).toBe(read('web-dashboard/src/lib/theme.ts'))
    expect(region(read(`${dir}/src/style.css`))).toBe(region(css))
    const i18n = read(`${dir}/src/lib/i18n.ts`)
    // (?<![A-Za-z0-9_]) — ключ считается целиком: иначе «ach_reward_theme_mint:» (награды-темы в достижениях) засчитывается как «theme_mint:»
    for (const k of NEW) expect(i18n.match(new RegExp(`(?<![A-Za-z0-9_])theme_${k}:`, 'g')), `${dir} theme_${k}`).toHaveLength(2)
    const html = read(`${dir}/index.html`)
    for (const k of KEYS) {
      expect(html, `${dir} bg ${k}`).toMatch(new RegExp(`var bg = \\{[^}]*\\b${k}: '#`))
      expect(html, `${dir} ac ${k}`).toMatch(new RegExp(`var ac = \\{[^}]*\\b${k}: '#`))
    }
  })

  it('цвет meta theme-color у каждой темы совпадает с её --bg', () => {
    const ts = read('web-dashboard/src/lib/theme.ts')
    for (const k of KEYS) expect(ts).toContain(`${k}: '${vars(k)['bg']}'`)
  })
})

describe('шапка и общий сайт', () => {
  it('шапка знает все темы и красит воду/золото новых тем', () => {
    const prefs = read('web-header/src/lib/prefs.ts')
    const hcss = read('web-header/src/header.css')
    for (const k of KEYS) expect(prefs, k).toContain(`${k}: 'theme_${k}'`)
    for (const k of NEW) {
      expect(hcss, k).toContain(`html.theme-${k} .gh-root { --water-top: ${vars(k)['water-top']}`)
      expect(hcss, k).toMatch(new RegExp(`html\\.theme-${k} \\.gh-root[,\\s][^}]*--water-gold`))
    }
    const hi18n = read('web-header/src/lib/i18n.ts')
    for (const k of NEW) expect(hi18n.match(new RegExp(`(?<![A-Za-z0-9_])theme_${k}:`, 'g')), k).toHaveLength(2)
  })

  it('общий сайт: ключи в theme.js и подписи в i18n.js, блоки в корневом style.css', () => {
    const js = read('theme.js')
    const rootCss = read('style.css')
    const rootI18n = read('i18n.js')
    for (const k of NEW) {
      expect(js, k).toContain(`${k}: "theme_${k}"`)
      expect(js, k).toContain(`${k}: "${vars(k)['bg']}"`)
      expect(rootI18n.match(new RegExp(`(?<![A-Za-z0-9_])theme_${k}:`, 'g')), k).toHaveLength(2)
      expect(rootCss, k).toContain(`html.theme-${k} {`)
    }
  })
})
