import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node; ?raw для .css в vitest отдаёт пустую строку (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'
import SplashLoader from './components/SplashLoader.vue'
import SplashFlameLive from './components/splash/SplashFlameLive.vue'

const html: string = readFileSync('index.html', 'utf-8')
const css: string = readFileSync('src/style.css', 'utf-8')

// d="…" всех <path> внутри компонента/куска разметки — для сверки контуров статичной заставки с компонентом
const pathsOf = (markup: string) => [...markup.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1])

describe('SplashLoader', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('по умолчанию — «живое пламя»; role=status, подпись «Загрузка…»', () => {
    const w = mount(SplashLoader)
    expect(w.find('[data-test="splash"]').attributes('role')).toBe('status')
    expect(w.find('[data-test="splash"]').attributes('data-variant')).toBe('flame')
    expect(w.find('svg.splash-live').exists()).toBe(true)
    expect(w.text()).toContain('Загрузка')
  })

  it('«классика» (v1.70) никуда не делась: контур с огоньком, как раньше', () => {
    const w = mount(SplashLoader, { props: { variant: 'classic' } })
    expect(w.find('svg.splash-flame').exists()).toBe(true)
    expect(w.find('.fl-outer').exists() && w.find('.fl-inner').exists()).toBe(true)
    expect(w.find('svg.splash-live').exists()).toBe(false)
  })

  it('«огненный круг»: кольцо с тремя дугами хвоста и огоньком в центре', () => {
    const w = mount(SplashLoader, { props: { variant: 'ring' } })
    expect(w.find('svg.splash-ring').exists()).toBe(true)
    expect(w.findAll('.splash-ring .arc')).toHaveLength(3)
    expect(w.find('.splash-ring .ring-flame .fl-outer').exists()).toBe(true)
  })

  it('вариант берётся из localStorage; английская подпись при EN', () => {
    localStorage.setItem('splash_variant', 'ring')
    localStorage.setItem('site_lang', 'en')
    const w = mount(SplashLoader)
    expect(w.find('[data-test="splash"]').attributes('data-variant')).toBe('ring')
    expect(w.text()).toContain('Loading')
  })
})

describe('живое пламя: устройство', () => {
  it('три языка пламени + сердцевина + искры; у языков РАЗНЫЕ анимации (а не один общий контур)', () => {
    const w = mount(SplashFlameLive)
    expect(w.findAll('.tongue')).toHaveLength(4)
    expect(w.findAll('.spark').length).toBeGreaterThanOrEqual(3)
    for (const k of ['tongue-c', 'tongue-l', 'tongue-r', 'tongue-core']) {
      expect(css).toMatch(new RegExp(`\\.splash-live \\.${k} \\{[^}]*animation: ${k} `))
      expect(css).toContain(`@keyframes ${k}`)
    }
    expect(css).toContain('@keyframes spark-rise')
  })
})

describe('index.html: статичная заставка до загрузки бандла', () => {
  it('внутри #app, три варианта, цвет по теме, выбор по data-splash', () => {
    expect(html).toMatch(/<div id="app">\s*<div class="pre-splash"/)
    for (const c of ['pre-flame', 'pre-ring', 'pre-classic']) expect(html).toContain(`class="${c}`)
    expect(html).toContain("setAttribute('data-splash'")
    expect(html).toContain("'classic', 'flame', 'ring'")
    expect(html).toContain('--pre-accent')
  })

  it('контуры статичных копий совпадают с компонентами (чтобы при смене на Vue ничего не «прыгало»)', () => {
    const live = readFileSync('src/components/splash/SplashFlameLive.vue', 'utf-8')
    const ring = readFileSync('src/components/splash/SplashFireRing.vue', 'utf-8')
    const loader = readFileSync('src/components/SplashLoader.vue', 'utf-8')
    const section = (cls: string) => {
      const a = html.indexOf(`class="${cls}`)
      return html.slice(a, html.indexOf('</svg>', a))
    }
    expect(pathsOf(section('pre-flame'))).toEqual(pathsOf(live))
    expect(pathsOf(section('pre-ring'))).toEqual(pathsOf(ring))
    expect(pathsOf(section('pre-classic'))).toEqual(pathsOf(loader))
    // и совпадают числа геометрии колец / искр
    for (const r of ['r="30"', 'r="22"']) {
      expect(ring).toContain(r)
      expect(section('pre-ring')).toContain(r)
    }
    expect([...live.matchAll(/cx="(\d+)" cy="(\d+)"/g)].map((m) => m[0])).toEqual([...section('pre-flame').matchAll(/cx="(\d+)" cy="(\d+)"/g)].map((m) => m[0]))
  })

  it('акценты тем в index.html совпадают с style.css', () => {
    for (const theme of ['dark', 'monet', 'light', 'pink']) {
      const m = css.match(new RegExp('\\.theme-' + theme + '\\s*\\{[^}]*--accent:\\s*(#[0-9a-fA-F]{6})'))
      expect(m, theme).toBeTruthy()
      expect(html.toLowerCase()).toContain(`${theme}: '${m![1].toLowerCase()}'`)
    }
  })

  it('движение выключается: prefers-reduced-motion и html[data-motion=off] — и у статичной, и у компонентной заставки', () => {
    expect(html).toContain('prefers-reduced-motion')
    expect(html).toContain("html[data-motion='off']")
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).toContain("html[data-motion='off'] .splash-live")
    expect(css).toContain("html[data-motion='off'] .splash-ring")
  })
})
