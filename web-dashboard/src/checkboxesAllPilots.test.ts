import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 567, «Аудит устаревшего оформления»): чекбокс в стиле сайта — тёмный фон и рамка в цвет текста, отмеченный
// заливается акцентом темы с галочкой (для светлого акцента Monet — тёмная галочка). Эталон — Дашборд; блок правил обязан быть
// в style.css КАЖДОЙ страницы пилота и в собранном css, иначе страница вернётся к родному «белому квадрату».
// web-header проверяется тоже (BACKLOG 567, агент 7): исходник — web-header/src/header.css, собранное — header-widgets/header.js.
const ROOT = '..'
const read = (path: string): string => readFileSync(path, 'utf-8')
// Шапка (web-header) — отдельный бандл: исходник правил — src/header.css, собранное — header-widgets/header.js (CSS вшит строкой).
const srcCssPath = (pilot: string): string => (pilot === 'web-header' ? `${ROOT}/web-header/src/header.css` : `${ROOT}/${pilot}/src/style.css`)
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && existsSync(srcCssPath(d)))
const readBuilt = (pilot: string): string | null => {
  if (pilot === 'web-header') return existsSync(`${ROOT}/header-widgets/header.js`) ? read(`${ROOT}/header-widgets/header.js`) : null
  const built = `${ROOT}/${pilot.replace(/^web-/, '')}/assets`
  if (!existsSync(built)) return null // страница ещё не собрана
  return (readdirSync(built) as string[])
    .filter((f: string) => f.endsWith('.css'))
    .map((f: string) => read(`${built}/${f}`))
    .join('\n')
}

describe('чекбоксы в стиле сайта на каждой странице пилота', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots) {
    it(`${pilot}: блок правил есть в style.css`, () => {
      const css = read(srcCssPath(pilot))
      expect(css).toMatch(/input\[type='checkbox'\]\s*\{[^}]*appearance:\s*none/)
      expect(css).toMatch(/input\[type='checkbox'\]:checked\s*\{[^}]*background-color:\s*var\(--accent\)/)
      expect(css).toMatch(/input\[type='checkbox'\]:focus-visible/)
      expect(css).toMatch(/input\[type='checkbox'\]:disabled/)
      // размер 17px и accent-color для радио задаёт общее правило — оно должно остаться рядом
      expect(css).toMatch(/input\[type='checkbox'\],\s*input\[type='radio'\]\s*\{[^}]*width:\s*17px/)
    })

    it(`${pilot}: блок есть в СОБРАННОМ css (то, что реально раздаётся)`, () => {
      const css = readBuilt(pilot)
      if (css === null) return
      expect(css, 'в собранном css нет правила чекбокса — пересоберите пилот (npm run build)').toMatch(/input\[type=["']?checkbox["']?\]\{[^}]*appearance:none/)
      expect(css).toMatch(/input\[type=["']?checkbox["']?\]:checked\{[^}]*background-color:var\(--accent\)/)
    })
  }

  // Галочка по умолчанию БЕЛАЯ. У тем со светлым акцентом (Monet, Nord, Mocha, AMOLED, High contrast …) она не читается, поэтому у них
  // галочка тёмная. Какие темы «светлые по акценту», считаем не списком в тесте, а по корневому style.css (там все темы сайта):
  // добавили тему со светлым акцентом и забыли тёмную галочку — тест упадёт с названием темы.
  describe('галочка читается на акценте каждой темы', () => {
    const rootCss = read(`${ROOT}/style.css`)
    const lum = (hex: string): number => {
      const h = hex.replace('#', '')
      const full = h.length === 3 ? h.split('').map((c: string) => c + c).join('') : h
      const [r, g, b] = [0, 2, 4].map((i: number) => parseInt(full.slice(i, i + 2), 16) / 255).map((c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const contrastWithWhite = (hex: string): number => 1.05 / (lum(hex) + 0.05)
    const themes: { name: string; accent: string }[] = []
    for (const m of rootCss.matchAll(/html\.theme-(\w+)\s*\{([^}]*)\}/g)) {
      const accent = /--accent:\s*(#[0-9a-fA-F]{3,6})/.exec(m[2])
      if (accent) themes.push({ name: m[1], accent: accent[1] })
    }

    it('в корневом style.css нашлись темы (тест не пустой)', () => {
      expect(themes.length).toBeGreaterThanOrEqual(11)
    })

    for (const pilot of pilots) {
      it(`${pilot}: у каждой темы с акцентом, где белая галочка < 3:1, есть тёмная галочка`, () => {
        const css = read(srcCssPath(pilot))
        // блок «html.theme-…, html.theme-… input[type='checkbox']:checked { background-image … }»
        const m = /((?:html\.theme-\w+ input\[type='checkbox'\]:checked,?\s*)+)\{[^}]*background-image/.exec(css)
        const darkThemes: string[] = m ? [...m[1].matchAll(/html\.theme-(\w+) input/g)].map((x) => x[1]) : []
        const needDark = themes.filter((t) => contrastWithWhite(t.accent) < 3).map((t) => t.name)
        const missing = needDark.filter((name: string) => !darkThemes.includes(name))
        expect(missing, `темы со светлым акцентом без тёмной галочки в ${pilot}/src/style.css (добавьте их в список html.theme-… input[type='checkbox']:checked)`).toEqual([])
        // и наоборот: тёмная галочка на ТЁМНОМ акценте была бы нечитаема
        const wrong = darkThemes.filter((name: string) => !needDark.includes(name))
        expect(wrong, 'тёмная галочка у темы, где белая и так читается').toEqual([])
      })
    }
  })
})
