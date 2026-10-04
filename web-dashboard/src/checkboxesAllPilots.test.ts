import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 567, «Аудит устаревшего оформления»): чекбокс в стиле сайта — тёмный фон и рамка в цвет текста, отмеченный
// заливается акцентом темы с галочкой (для светлого акцента Monet — тёмная галочка). Эталон — Дашборд; блок правил обязан быть
// в style.css КАЖДОЙ страницы пилота и в собранном css, иначе страница вернётся к родному «белому квадрату».
// web-header — отдельный бандл виджетов без общего style.css (его чекбоксы — вместе с владельцем шапки).
const ROOT = '..'
const EXEMPT = ['web-header']
const read = (path: string): string => readFileSync(path, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && !EXEMPT.includes(d) && existsSync(`${ROOT}/${d}/src/style.css`))

describe('чекбоксы в стиле сайта на каждой странице пилота', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots) {
    it(`${pilot}: блок правил есть в style.css`, () => {
      const css = read(`${ROOT}/${pilot}/src/style.css`)
      expect(css).toMatch(/input\[type='checkbox'\]\s*\{[^}]*appearance:\s*none/)
      expect(css).toMatch(/input\[type='checkbox'\]:checked\s*\{[^}]*background-color:\s*var\(--accent\)/)
      expect(css).toMatch(/html\.theme-monet input\[type='checkbox'\]:checked/)
      expect(css).toMatch(/input\[type='checkbox'\]:focus-visible/)
      expect(css).toMatch(/input\[type='checkbox'\]:disabled/)
      // размер 17px и accent-color для радио задаёт общее правило — оно должно остаться рядом
      expect(css).toMatch(/input\[type='checkbox'\],\s*input\[type='radio'\]\s*\{[^}]*width:\s*17px/)
    })

    it(`${pilot}: блок есть в СОБРАННОМ css (то, что реально раздаётся)`, () => {
      const built = `${ROOT}/${pilot.replace(/^web-/, '')}/assets`
      if (!existsSync(built)) return
      const css: string = (readdirSync(built) as string[])
        .filter((f: string) => f.endsWith('.css'))
        .map((f: string) => read(`${built}/${f}`))
        .join('\n')
      expect(css, 'в собранном css нет правила чекбокса — пересоберите пилот (npm run build)').toMatch(/input\[type=["']?checkbox["']?\]\{[^}]*appearance:none/)
      expect(css).toMatch(/input\[type=["']?checkbox["']?\]:checked\{[^}]*background-color:var\(--accent\)/)
    })
  }
})
