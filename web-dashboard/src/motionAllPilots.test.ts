import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// «Страж» выключателя анимаций (BACKLOG 16, 14:02): флаг `site_motion=off` → <html data-motion="off"> должен
// работать на КАЖДОЙ странице пилота: общее CSS-правило в src/style.css и ранний inline-скрипт в index.html
// (флаг до первой отрисовки). Новая страница web-<стр>/ без них не пройдёт этот тест — так выключатель
// не «протекает» на страницах, добавленных позже. web-header — отдельный бандл виджетов со своими правилами.
const ROOT = resolve(__dirname, '../..')
const EXEMPT = new Set(['web-header'])
const pilots = readdirSync(ROOT).filter((d) => /^web-/.test(d) && !EXEMPT.has(d) && existsSync(join(ROOT, d, 'index.html')))

describe('выключатель анимаций есть у каждой страницы пилота', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots) {
    it(`${pilot}: правило в style.css гасит animation и transition`, () => {
      const css = readFileSync(join(ROOT, pilot, 'src/style.css'), 'utf-8')
      const m = css.match(/html\[data-motion='off'\] \*,[\s\S]*?\{([\s\S]*?)\}/)
      expect(m, 'нет правила html[data-motion=off] *').not.toBeNull()
      expect(m![1]).toMatch(/animation:\s*none\s*!important/)
      expect(m![1]).toMatch(/transition:\s*none\s*!important/)
    })

    it(`${pilot}: комментарии в style.css сбалансированы (иначе правило молча теряется при сборке)`, () => {
      // Реальный случай: «*/» внутри текста комментария закрыл его досрочно, и следующее правило пропало из сборки.
      const css = readFileSync(join(ROOT, pilot, 'src/style.css'), 'utf-8')
      expect(css.split('/*').length - 1).toBe(css.split('*/').length - 1)
    })

    it(`${pilot}: правило есть в СОБРАННОМ css (то, что реально раздаётся)`, () => {
      const built = join(ROOT, pilot.replace(/^web-/, ''), 'assets')
      if (!existsSync(built)) return // страница ещё не собрана
      const css = readdirSync(built)
        .filter((f) => f.endsWith('.css'))
        .map((f) => readFileSync(join(built, f), 'utf-8'))
        .join('\n')
      expect(css, 'в собранном css нет правила — пересоберите пилот (npm run build)').toMatch(/html\[data-motion=['"]?off['"]?\] \*/)
    })

    it(`${pilot}: index.html ставит флаг до первой отрисовки`, () => {
      const html = readFileSync(join(ROOT, pilot, 'index.html'), 'utf-8')
      expect(html).toContain("localStorage.getItem('site_motion') === 'off'")
      expect(html).toContain("setAttribute('data-motion', 'off')")
      // скрипт стоит в <head>, до загрузки основного модуля
      expect(html.indexOf('site_motion')).toBeLessThan(html.indexOf('src="/src/main.ts"'))
    })
  }
})
