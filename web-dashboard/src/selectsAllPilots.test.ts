import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 567): у выпадающих списков (<select>) единая стрелка в цветах темы вместо системной «из 2000-х».
// Правило обязано быть в style.css КАЖДОЙ страницы пилота и в собранном css. Важна деталь: у многих списков фон задан инлайн
// шорткатом `background: …`, который сбрасывает картинку, — поэтому у свойств стрелки обязателен !important, а цвет фона,
// рамку и текст правило НЕ трогает (иначе перебило бы оформление, заданное самим списком).
// web-header — отдельный бандл виджетов без общего style.css (его три списка — вместе с владельцем шапки).
const ROOT = '..'
const EXEMPT = ['web-header']
const read = (path: string): string => readFileSync(path, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && !EXEMPT.includes(d) && existsSync(`${ROOT}/${d}/src/style.css`))

function ruleBody(css: string): string {
  const i = css.search(/select:not\(\[multiple\]\)/)
  if (i < 0) return ''
  return css.slice(i, css.indexOf('}', i) + 1)
}

describe('единая стрелка у выпадающих списков на каждой странице пилота', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots) {
    it(`${pilot}: правило есть в style.css, стрелка с !important, фон/рамка/цвет не заданы`, () => {
      const body = ruleBody(read(`${ROOT}/${pilot}/src/style.css`))
      expect(body, 'нет правила select:not([multiple]):not([size])').not.toBe('')
      expect(body).toMatch(/:not\(\[size\]\)/) // списки с size/multiple — не выпадающие
      expect(body).toMatch(/background-image:[^;]*linear-gradient[^;]*!important/)
      expect(body).toMatch(/background-position:[^;]*!important/)
      expect(body).toMatch(/background-size:[^;]*!important/)
      expect(body).toMatch(/background-repeat:\s*no-repeat\s*!important/)
      expect(body).not.toMatch(/background-color|border|(^|[\s;{])color:|(^|[\s;{])background:/)
    })

    it(`${pilot}: правило есть в СОБРАННОМ css (то, что реально раздаётся)`, () => {
      const built = `${ROOT}/${pilot.replace(/^web-/, '')}/assets`
      if (!existsSync(built)) return
      const css: string = (readdirSync(built) as string[])
        .filter((f: string) => f.endsWith('.css'))
        .map((f: string) => read(`${built}/${f}`))
        .join('\n')
      expect(css, 'в собранном css нет правила для select — пересоберите пилот (npm run build)').toMatch(/select:not\(\[multiple\]\)[^{]*\{[^}]*linear-gradient/)
    })
  }
})
