import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 567 / 789): родные стрелки у input type=number выглядели «как из 2000-х» — правило, скрывающее их,
// должно быть в style.css КАЖДОЙ страницы пилота и в собранном css. Новая страница web-<стр>/ без него не пройдёт тест.
// web-header — отдельный бандл виджетов без общего style.css.
// Vitest запускается из папки web-dashboard/, корень репозитория — на уровень выше.
const ROOT = '..'
const EXEMPT = ['web-header']
const read = (path: string): string => readFileSync(path, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && !EXEMPT.includes(d) && existsSync(`${ROOT}/${d}/src/style.css`))

describe('родные стрелки числовых полей скрыты на каждой странице пилота', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots) {
    it(`${pilot}: правило есть в style.css`, () => {
      const css = read(`${ROOT}/${pilot}/src/style.css`)
      expect(css).toMatch(/input\[type='number'\]::-webkit-inner-spin-button/)
      expect(css).toMatch(/input\[type='number'\]\s*\{[^}]*appearance:\s*textfield/)
    })

    it(`${pilot}: правило есть в СОБРАННОМ css (то, что реально раздаётся)`, () => {
      const built = `${ROOT}/${pilot.replace(/^web-/, '')}/assets`
      if (!existsSync(built)) return // страница ещё не собрана
      const css: string = (readdirSync(built) as string[])
        .filter((f: string) => f.endsWith('.css'))
        .map((f: string) => read(`${built}/${f}`))
        .join('\n')
      expect(css, 'в собранном css нет правила — пересоберите пилот (npm run build)').toMatch(/input\[type=['"]?number['"]?\]::-webkit-inner-spin-button/)
    })
  }
})
