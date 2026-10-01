import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionOff.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» выключателя анимаций (BACKLOG 16, 14:02): флаг `site_motion=off` → <html data-motion="off"> должен
// работать на КАЖДОЙ странице пилота: общее CSS-правило в src/style.css и ранний inline-скрипт в index.html
// (флаг до первой отрисовки). Новая страница web-<стр>/ без них не пройдёт этот тест — так выключатель
// не «протекает» на страницах, добавленных позже. web-header — отдельный бандл виджетов со своими правилами.
// Vitest запускается из папки web-dashboard/ (как и в соседних тестах), корень репозитория — на два уровня выше.
const ROOT = '..'
const EXEMPT = ['web-header']
const read = (path: string): string => readFileSync(path, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && !EXEMPT.includes(d) && existsSync(`${ROOT}/${d}/index.html`))

describe('выключатель анимаций есть у каждой страницы пилота', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots) {
    it(`${pilot}: правило в style.css гасит animation и transition`, () => {
      const css = read(`${ROOT}/${pilot}/src/style.css`)
      const m = css.match(/html\[data-motion='off'\] \*,[\s\S]*?\{([\s\S]*?)\}/)
      expect(m, 'нет правила html[data-motion=off] *').not.toBeNull()
      expect(m![1]).toMatch(/animation:\s*none\s*!important/)
      expect(m![1]).toMatch(/transition:\s*none\s*!important/)
    })

    it(`${pilot}: комментарии в style.css сбалансированы (иначе правило молча теряется при сборке)`, () => {
      // Реальный случай: «*/» внутри текста комментария закрыл его досрочно, и следующее правило пропало из сборки.
      const css = read(`${ROOT}/${pilot}/src/style.css`)
      expect(css.split('/*').length - 1).toBe(css.split('*/').length - 1)
    })

    it(`${pilot}: правило есть в СОБРАННОМ css (то, что реально раздаётся)`, () => {
      const built = `${ROOT}/${pilot.replace(/^web-/, '')}/assets`
      if (!existsSync(built)) return // страница ещё не собрана
      const css: string = (readdirSync(built) as string[])
        .filter((f: string) => f.endsWith('.css'))
        .map((f: string) => read(`${built}/${f}`))
        .join('\n')
      expect(css, 'в собранном css нет правила — пересоберите пилот (npm run build)').toMatch(/html\[data-motion=['"]?off['"]?\] \*/)
    })

    it(`${pilot}: index.html ставит флаг до первой отрисовки`, () => {
      const html = read(`${ROOT}/${pilot}/index.html`)
      expect(html).toContain("localStorage.getItem('site_motion') === 'off'")
      expect(html).toContain("setAttribute('data-motion', 'off')")
      // скрипт стоит в <head>, до загрузки основного модуля
      expect(html.indexOf('site_motion')).toBeLessThan(html.indexOf('src="/src/main.ts"'))
    })
  }
})
