import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts пилота Дашборда).
import { readFileSync } from 'node:fs'

// BACKLOG 🛠 «SplashScreen / Заглушка»: статичная заставка с огоньком в index.html (видна, пока грузится бандл; Vue
// заменяет содержимое #app при монтировании). Образец и единственный источник правды — web-dashboard/index.html:
// разметка здесь должна совпадать с ним, чтобы страницы не расходились.
const html: string = readFileSync('index.html', 'utf-8')
const dash: string = readFileSync('../web-dashboard/index.html', 'utf-8')

const between = (s: string, a: string, b: string) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a)))
const paths = (s: string) => [...s.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1])

describe('статичная заставка (workouts)', () => {
  it('внутри #app, три варианта огонька, скрыта от скринридера', () => {
    expect(html).toMatch(/<div id="app">\s*<div class="pre-splash" aria-hidden="true">/)
    for (const c of ['pre-flame pre-live', 'pre-ring', 'pre-classic']) expect(html).toContain(`class="${c}`)
  })

  it('контуры всех трёх огоньков совпадают с web-dashboard/index.html', () => {
    const mine = between(html, '<div class="pre-splash"', '<script type="module"')
    const theirs = between(dash, '<div class="pre-splash"', '<script type="module"')
    expect(paths(mine).length).toBeGreaterThan(5)
    expect(paths(mine)).toEqual(paths(theirs))
  })

  it('стили заставки (<style> в <head>) идентичны образцу, включая reduced-motion и «все анимации»', () => {
    const mine = between(html, '/* Заставка до загрузки бандла', '</style>')
    const theirs = between(dash, '/* Заставка до загрузки бандла', '</style>')
    expect(mine.length).toBeGreaterThan(1500)
    expect(mine).toBe(theirs)
    expect(mine).toContain('prefers-reduced-motion')
    expect(mine).toContain("html[data-motion='off']")
  })

  it('скрипт темы ставит --pre-bg, --pre-accent и data-splash до первой отрисовки; акценты совпадают с образцом', () => {
    expect(html).toContain("setProperty('--pre-accent'")
    expect(html).toContain("setAttribute('data-splash'")
    expect(html).toContain("'classic', 'flame', 'ring'")
    const acc = (s: string) => s.match(/var ac = \{[^}]*\}\[t\]/)?.[0]
    expect(acc(html)).toBeTruthy()
    expect(acc(html)).toBe(acc(dash))
    expect(html.indexOf("setAttribute('data-splash'")).toBeLessThan(html.indexOf('</head>'))
  })

  it('фон html следует за текущей темой (var(--bg) первым), --pre-bg — запасной до загрузки бандла', () => {
    expect(html).toContain('html { background: var(--bg, var(--pre-bg, #121212)); }')
  })

  it('скрипт модуля и остальные теги head на месте (манифест, иконка, motion)', () => {
    expect(html).toContain('<script type="module" src="/src/main.ts"></script>')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain("localStorage.getItem('site_motion') === 'off'")
  })
})
