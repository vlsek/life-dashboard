import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'
import SplashFlameLive from './components/splash/SplashFlameLive.vue'

const shell: string = readFileSync('src/components/AppShell.vue', 'utf-8')
const css: string = readFileSync('src/style.css', 'utf-8')

describe('SplashFlameLive: размер и искры', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('по умолчанию как на заставке: 80 px и искры', () => {
    const w = mount(SplashFlameLive)
    expect(w.find('svg').attributes('width')).toBe('80')
    expect(w.findAll('.spark').length).toBeGreaterThanOrEqual(3)
    expect(w.find('svg').classes()).not.toContain('splash-live-sm')
  })

  it('size=30, sparks=false: компактный логотип без искр, помечен splash-live-sm', () => {
    const w = mount(SplashFlameLive, { props: { size: 30, sparks: false } })
    expect(w.find('svg').attributes('width')).toBe('30')
    expect(w.find('svg').attributes('height')).toBe('30')
    expect(w.findAll('.spark')).toHaveLength(0)
    expect(w.find('svg').classes()).toContain('splash-live-sm')
    expect(w.findAll('.tongue')).toHaveLength(4) // языки пламени на месте — горит по-настоящему
  })
})

describe('логотип слева сверху в шапке', () => {
  it('AppShell использует живое пламя, статичной картинки favicon.svg там больше нет', () => {
    expect(shell).toContain('<SplashFlameLive :size="30" :sparks="false"')
    expect(shell).toContain("import SplashFlameLive from './splash/SplashFlameLive.vue'")
    expect(shell).not.toContain('<img src="/favicon.svg"')
  })

  it('ссылка на дашборд и подпись у логотипа сохранены', () => {
    expect(shell).toContain('href="/dashboard/"')
    expect(shell).toContain("plainLabel('nav_dashboard')")
  })

  it('мелкий вариант гасит общее свечение-пульсацию и берёт мягкую тень; анимации языков остаются и выключаются общими правилами', () => {
    const m = css.match(/\.splash-live\.splash-live-sm\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toContain('animation: none')
    expect(m![1]).toContain('drop-shadow')
    expect(css).toContain("html[data-motion='off'] .splash-live *")
    expect(css).toContain('.splash-live *')
  })
})
