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
  it('ОДНО пламя: три слоя (внешний, средний, сердцевина) в одной группе; контур морфится, слои идут с разной фазой', () => {
    const w = mount(SplashFlameLive)
    expect(w.findAll('.flame-body')).toHaveLength(1)
    expect(w.findAll('.flame-layer')).toHaveLength(3)
    expect(w.findAll('.spark').length).toBeGreaterThanOrEqual(3)
    expect(css).toMatch(/\.splash-live \.layer-outer \{[^}]*animation: flame-morph-out /)
    expect(css).toMatch(/\.splash-live \.layer-mid \{[^}]*animation: flame-morph-out [^;]*-0\.5s/)
    expect(css).toMatch(/\.splash-live \.layer-core \{[^}]*animation: flame-morph-core /)
    for (const k of ['flame-morph-out', 'flame-morph-core', 'flame-sway', 'spark-rise']) expect(css).toContain(`@keyframes ${k}`)
    // морфинг: в каждой анимации контура три формы с ОДИНАКОВОЙ структурой команд (иначе контур не перетекает)
    for (const k of ['flame-morph-out', 'flame-morph-core']) {
      const body = css.slice(css.indexOf(`@keyframes ${k}`), css.indexOf('}\n}', css.indexOf(`@keyframes ${k}`)))
      const shapes = [...body.matchAll(/d: path\("([^"]+)"\)/g)].map((m) => m[1].replace(/[-\d.\s,]+/g, ''))
      expect(shapes).toHaveLength(3)
      expect(new Set(shapes).size).toBe(1)
    }
  })

  it('у единого пламени (.splash-live) и у пламени стрика (.streak-live) нет старых языков; вариант «tongues» вправе иметь свои', () => {
    expect(css).not.toMatch(/\.(?:splash|streak)-live \.tongue/)
    expect(css).toMatch(/\.streak-live \.layer-outer \{[^}]*animation: flame-morph-out /)
    expect(css).toMatch(/\.streak-live \.layer-core \{[^}]*animation: flame-morph-core /)
  })
})

describe('index.html: статичная заставка до загрузки бандла', () => {
  it('внутри #app, три варианта, цвет по теме, выбор по data-splash', () => {
    expect(html).toMatch(/<div id="app">\s*<div class="pre-splash"/)
    for (const c of ['pre-flame', 'pre-ring', 'pre-classic', 'pre-tongues']) expect(html).toContain(`class="${c}`)
    expect(html).toContain("setAttribute('data-splash'")
    expect(html).toContain("'classic', 'flame', 'ring', 'tongues'")
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
    expect(pathsOf(section('pre-tongues'))).toEqual(pathsOf(readFileSync('src/components/splash/SplashFlameTongues.vue', 'utf-8')))
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

describe('index.html: фон html следует за текущей темой (🐞 «пропадает фон внизу при прокрутке»)', () => {
  it('html { background } сначала берёт var(--bg) (меняется вместе с темой), --pre-bg — только запасной до загрузки бандла', () => {
    const m = html.match(/\n\s*html \{ background: ([^;]+); \}/)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/^var\(--bg, var\(--pre-bg,/)
  })

  it('фиксированного html { background: var(--pre-bg…) } без --bg больше нет — он перекрывал фон body после смены темы', () => {
    expect(html).not.toMatch(/html \{ background: var\(--pre-bg[^}]*\}/)
  })

  it('body по-прежнему красится var(--bg) в style.css, а у html/body/#app есть height: 100%', () => {
    expect(css).toMatch(/body \{[^}]*background: var\(--bg\)/)
    expect(css).toMatch(/html,\s*body,\s*#app \{\s*height: 100%;/)
  })
})

describe('вариант «Три языка» (BACKLOG 16: старое пламя вернулось)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('SplashLoader с variant=tongues: три языка + сердцевина + 4 искры в одном svg.splash-live.splash-tongues', () => {
    const w = mount(SplashLoader, { props: { variant: 'tongues' } })
    expect(w.find('[data-test="splash"]').attributes('data-variant')).toBe('tongues')
    const svg = w.find('svg.splash-live.splash-tongues')
    expect(svg.exists()).toBe(true)
    for (const c of ['tongue-l', 'tongue-r', 'tongue-c', 'tongue-core']) expect(svg.find(`.${c}`).exists(), c).toBe(true)
    expect(svg.findAll('.spark')).toHaveLength(4)
    expect(w.find('.flame-body').exists()).toBe(false) // это не единое пламя
  })

  it('выбор из хранилища и из адреса работает для tongues', () => {
    localStorage.setItem('splash_variant', 'tongues')
    expect(mount(SplashLoader).find('[data-test="splash"]').attributes('data-variant')).toBe('tongues')
  })

  it('CSS: языки с собственными скоростями и keyframes tongue-*, подчинены общему «уменьшить движение»', () => {
    for (const [c, k] of [['tongue-c', 'tongue-c'], ['tongue-l', 'tongue-l'], ['tongue-r', 'tongue-r'], ['tongue-core', 'tongue-core']]) {
      expect(css).toMatch(new RegExp(`\\.splash-tongues \\.${c} \\{[^}]*animation: ${k} `))
      expect(css).toContain(`@keyframes ${k}`)
    }
    expect(css).toMatch(/\.splash-live, \.splash-ring, \.splash-live \*, \.splash-ring \* \{ animation: none !important; \}/)
  })

  it('статичная заставка: ВО ВСЕХ пилотах есть вариант tongues (разметка, стили, ключ в списке)', () => {
    const dirs = ['dashboard', 'account', 'achievements', 'calendar', 'challenges', 'community', 'customization', 'goals', 'header', 'history', 'languages', 'login', 'milestones', 'onboarding', 'shop', 'skills', 'workouts']
    let n = 0
    for (const d of dirs) {
      let h: string
      try {
        h = readFileSync(`../web-${d}/index.html`, 'utf-8')
      } catch {
        continue
      }
      if (!h.includes('pre-classic')) continue
      n++
      expect(h, d).toContain("'classic', 'flame', 'ring', 'tongues'")
      expect(h, d).toContain('class="pre-tongues"')
      expect(h, d).toContain("html[data-splash='tongues'] .pre-splash .pre-tongues { display: block; }")
    }
    expect(n).toBeGreaterThanOrEqual(15)
  })
})
