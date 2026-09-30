import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node; ?raw для .css в vitest отдаёт пустую строку (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'
import SplashLoader from './components/SplashLoader.vue'

describe('SplashLoader', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('показывает огонёк и подпись «Загрузка…», доступен скринридеру как status', () => {
    const w = mount(SplashLoader)
    expect(w.find('[data-test="splash"]').attributes('role')).toBe('status')
    expect(w.find('svg.splash-flame').exists()).toBe(true)
    expect(w.find('.fl-outer').exists() && w.find('.fl-inner').exists()).toBe(true)
    expect(w.text()).toContain('Загрузка')
  })

  it('англоязычная подпись при EN', () => {
    localStorage.setItem('site_lang', 'en')
    expect(mount(SplashLoader).text()).toContain('Loading')
  })

  it('контуры огонька совпадают со статичной заставкой в index.html (чтобы при смене не «прыгало»)', () => {
    const html: string = readFileSync('index.html', 'utf-8')
    const w = mount(SplashLoader)
    const outer = w.find('.fl-outer').attributes('d')!
    const inner = w.find('.fl-inner').attributes('d')!
    expect(html).toContain(outer)
    expect(html).toContain(inner)
  })

  it('index.html: заставка внутри #app, есть цвет по теме и учтён prefers-reduced-motion', () => {
    const html: string = readFileSync('index.html', 'utf-8')
    expect(html).toMatch(/<div id="app">\s*<div class="pre-splash"/)
    expect(html).toContain('--pre-accent')
    for (const accent of ['#5b8def', '#f2a93c', '#d97f2a', '#ff4f81']) expect(html).toContain(accent)
    expect(html).toContain('prefers-reduced-motion')
  })

  it('акценты в index.html совпадают с акцентами тем в style.css', () => {
    const css: string = readFileSync('src/style.css', 'utf-8')
    const html: string = readFileSync('index.html', 'utf-8')
    for (const theme of ['dark', 'monet', 'light', 'pink']) {
      const m = css.match(new RegExp('\\.theme-' + theme + '\\s*\\{[^}]*--accent:\\s*(#[0-9a-fA-F]{6})'))
      expect(m, theme).toBeTruthy()
      expect(html.toLowerCase()).toContain(`${theme}: '${m![1].toLowerCase()}'`)
    }
  })
})
