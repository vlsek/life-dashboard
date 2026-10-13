// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в themes.test.ts)
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// BACKLOG 50.1 «Простое оформление»: ручной переключатель (настройки шапки) → localStorage `site_simple` = 'on' → <html data-simple="on">.
// Страницы ставят флаг ДО первой отрисовки (скрипт в <head>), а style.css гасит эффекты «больших» тем теми же отключениями, что и prefers-contrast: more.
const read = (p: string): string => readFileSync('../' + p, 'utf-8')
const pilots = readdirSync('..').filter((d: string) => /^web-/.test(d) && existsSync('../' + d + '/src/lib/theme.ts'))
const REGION = /\/\* design-tokens:start[^*]*\*\/[\s\S]*?\/\* design-tokens:end \*\//

describe('«Простое оформление»: страницы ставят флаг до первой отрисовки', () => {
  for (const d of pilots) {
    it(d + ': скрипт в <head> читает site_simple и ставит data-simple="on"', () => {
      const html = read(d + '/index.html')
      expect(html).toContain("localStorage.getItem('site_simple') === 'on'")
      expect(html).toContain("document.documentElement.setAttribute('data-simple', 'on')")
      // скрипт — в <head>, раньше подключения бандла (иначе первый кадр мелькнёт с эффектами)
      expect(html.indexOf('site_simple')).toBeLessThan(html.indexOf('</head>'))
      expect(html.indexOf('site_simple')).toBeLessThan(html.search(/<script type="module"/))
      expect(html.split('site_simple').length - 1, 'скрипт вставлен ровно один раз').toBe(1)
    })
  }
})

describe('«Простое оформление»: CSS гасит эффекты только у больших тем, где они есть', () => {
  const EXPECT: Record<string, string[]> = {
    moonlight: ['--shadow-active: none;', '--bg-pattern: none;'],
    phosphor: ['--scanlines: none;'],
    nightfall: ['--shadow-card: none;', '--shadow-active: 0 0 0 2px #bb9af7;'],
    frost: ['--bg-pattern: none;'],
    matcha: ['--shadow-card: none;'], // светлая «пушистая»: рассеянная тёплая тень карточек (BACKLOG 57.7)
    cyberday: ['--bg-pattern: none;'], // светлый киберпанк: убирается только сетка точек, жёсткая тень — сам стиль
    meadow: ['--bg-pattern: none;', '--shadow-card: none;'], // летний луг: солнечное пятно и лёгкая тень (BACKLOG 57.7, файл 2)
    glass: ['--blur-glass: none;', '--bg-pattern: none;', '--shadow-card: none;', '--glass-alpha: 100%;'], // бизнес-стекло: без размытия, световых пятен, тени и прозрачности
  }
  for (const f of [...pilots.map((d: string) => d + '/src/style.css'), 'style.css']) {
    it(f + ': блоки html[data-simple="on"].theme-* внутри design-tokens', () => {
      const region = read(f).match(REGION)![0]
      const found = [...region.matchAll(/html\[data-simple='on'\]\.theme-(\w+) \{([^}]*)\}/g)]
      expect(found.map((m) => m[1]).sort()).toEqual(Object.keys(EXPECT).sort())
      for (const m of found) for (const decl of EXPECT[m[1]]) expect(m[2], f + ' ' + m[1]).toContain(decl)
    })
  }
  it('те же отключения, что и при prefers-contrast: more — выбор человека и система дают один результат', () => {
    const region = read('web-dashboard/src/style.css').match(REGION)![0]
    for (const k of Object.keys(EXPECT)) {
      const simple = region.match(new RegExp("html\\[data-simple='on'\\]\\.theme-" + k + ' \\{([^}]*)\\}'))![1].replace(/\s+/g, ' ').trim()
      const contrast = region.match(new RegExp('@media \\(prefers-contrast: more\\) \\{\\s*html\\.theme-' + k + ' \\{([^}]*)\\}'))![1].replace(/\s+/g, ' ').trim()
      expect(simple, k).toBe(contrast)
    }
  })
  it('темы без эффектов (emerald, velvet и обычные) этим переключателем не затронуты', () => {
    const region = read('web-dashboard/src/style.css').match(REGION)![0]
    for (const k of ['emerald', 'velvet', 'dark', 'light', 'nord']) expect(region).not.toContain("html[data-simple='on'].theme-" + k + ' ')
  })
})
