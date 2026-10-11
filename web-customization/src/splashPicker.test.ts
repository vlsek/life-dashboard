import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import SplashPicker from './components/SplashPicker.vue'
import { DEFAULT_SPLASH_VARIANT, SPLASH_VARIANTS, SPLASH_VARIANT_KEY, readSplashChoice, readSplashVariant } from './lib/splashVariant'
import { THEME_LOADER } from './lib/themeLoader'

const css: string = readFileSync('src/style.css', 'utf-8')

describe('SplashPicker: выбор заставки в «Кастомизации» (BACKLOG 16, срез 2)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    document.documentElement.removeAttribute('data-splash')
  })

  it('шесть карточек: «По теме» (по умолчанию, на обычной теме играет «Живое пламя») и пять вариантов; у каждой живой предпросмотр', () => {
    const w = mount(SplashPicker)
    expect(w.findAll('[data-testid^="splash-"][data-active]')).toHaveLength(6)
    expect(w.find('[data-testid="splash-auto"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="splash-auto"]').text()).toContain('По теме')
    expect(w.find('[data-testid="splash-auto-now"]').text()).toContain('Живое пламя')
    expect(w.find('[data-testid="splash-flame"]').attributes('data-active')).toBe('false')
    expect(w.find('[data-testid="splash-flame"]').text()).toContain('Живое пламя')
    expect(w.find('[data-testid="splash-tongues"]').text()).toContain('Три языка')
    expect(w.find('[data-testid="splash-tongues"] svg.splash-tongues .tongue-c').exists()).toBe(true)
    expect(w.find('[data-testid="splash-ring"] svg.splash-ring').exists()).toBe(true)
    expect(w.find('[data-testid="splash-orbit"] svg.splash-orbit .ob-core').exists()).toBe(true)
    expect(w.find('[data-testid="splash-orbit"]').text()).toContain('Орбита')
    expect(w.find('[data-testid="splash-classic"] svg.splash-flame').exists()).toBe(true)
    expect(w.find('[data-testid="splash-flame"] svg.splash-live .flame-body').exists()).toBe(true)
  })

  it('выбор «Три языка» запоминается в localStorage и в data-splash; кнопка выбранного отключена', async () => {
    const w = mount(SplashPicker)
    await w.find('[data-testid="splash-tongues"] [data-testid="splash-choose"]').trigger('click')
    expect(localStorage.getItem(SPLASH_VARIANT_KEY)).toBe('tongues')
    expect(document.documentElement.getAttribute('data-splash')).toBe('tongues')
    expect(w.find('[data-testid="splash-tongues"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="splash-auto"]').attributes('data-active')).toBe('false')
    expect(w.find('[data-testid="splash-tongues"] button').attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="splash-tongues"] button').text()).toBe('Выбрано')
    expect(readSplashVariant()).toBe('tongues')
  })

  it('сохранённый выбор подхватывается при открытии; мусор в хранилище игнорируется', () => {
    localStorage.setItem(SPLASH_VARIANT_KEY, 'ring')
    expect(mount(SplashPicker).find('[data-testid="splash-ring"]').attributes('data-active')).toBe('true')
    localStorage.setItem(SPLASH_VARIANT_KEY, 'nonsense')
    expect(readSplashVariant()).toBe(DEFAULT_SPLASH_VARIANT)
  })

  it('если хранилище недоступно — выбор не меняется и показывается сообщение', async () => {
    const w = mount(SplashPicker)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    try {
      await w.find('[data-testid="splash-ring"] [data-testid="splash-choose"]').trigger('click')
    } finally {
      spy.mockRestore()
    }
    expect(w.find('[data-testid="splash-save-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="splash-auto"]').attributes('data-active')).toBe('true')
  })

  it('список вариантов и ключ совпадают с реестром Дашборда', () => {
    const reg = readFileSync('../web-dashboard/src/lib/splashVariants.ts', 'utf-8')
    const list = reg.match(/SPLASH_VARIANTS = \[([^\]]+)\]/)![1].replace(/['\s]/g, '').split(',')
    expect([...SPLASH_VARIANTS]).toEqual(list)
    expect(reg).toContain(`DEFAULT_SPLASH_VARIANT: SplashVariant = '${DEFAULT_SPLASH_VARIANT}'`)
    expect(reg).toContain(`SPLASH_VARIANT_KEY = '${SPLASH_VARIANT_KEY}'`)
  })

  it('CSS вариантов перенесён из Дашборда (три языка, круг, классика) и подчинён «уменьшить движение»', () => {
    for (const s of ['.splash-tongues .tongue-c', '@keyframes tongue-core', '.splash-ring .ring-base', '@keyframes ring-spin', '.splash-flame .fl-outer', '@keyframes flame-flicker', '.splash-orbit .ob-o1', '@keyframes ob-spin'])
      expect(css, s).toContain(s)
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.splash-ring, \.splash-ring \*, \.splash-tongues \*/)
    expect(css).toContain("html[data-motion='off'] .splash-tongues *")
  })
})

describe('заставка большой темы (BACKLOG 55.5, срез 2)', () => {
  const setTheme = (k: string | null) => {
    document.documentElement.className = k ? `theme-${k}` : ''
  }
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    document.documentElement.removeAttribute('data-splash')
  })
  afterEach(() => setTheme(null))

  it('в THEME_LOADER только настоящие варианты, темы — из CHAR, и темы различаются', () => {
    for (const [k, v] of Object.entries(THEME_LOADER)) expect((SPLASH_VARIANTS as readonly string[]).includes(v), k).toBe(true)
    const src: string = readFileSync('../scripts/themes_data.py', 'utf-8')
    const chars = [...src.slice(src.indexOf('\nCHAR = {'), src.indexOf('\nassert all(k in P for k in CHAR)')).matchAll(/^    '(\w+)': dict\(/gm)].map((m) => m[1])
    for (const k of Object.keys(THEME_LOADER)) expect(chars, k).toContain(k)
    expect(new Set(Object.values(THEME_LOADER)).size).toBeGreaterThanOrEqual(3)
  })
  it('ничего не выбрано → заставка большой темы; обычная тема → «живое пламя»; ручной выбор главнее', () => {
    const [themed] = Object.entries(THEME_LOADER).find(([, v]) => v !== 'flame')!
    setTheme(themed)
    expect(readSplashVariant()).toBe(THEME_LOADER[themed])
    expect(readSplashChoice()).toBe('auto')
    setTheme('dark')
    expect(readSplashVariant()).toBe('flame')
    setTheme(themed)
    const other = THEME_LOADER[themed] === 'ring' ? 'tongues' : 'ring'
    localStorage.setItem(SPLASH_VARIANT_KEY, other)
    expect(readSplashVariant()).toBe(other)
    localStorage.setItem(SPLASH_VARIANT_KEY, 'flame') // явное «живое пламя» тоже главнее темы
    expect(readSplashVariant()).toBe('flame')
  })
  it('плитка «По теме» показывает заставку темы, выбор «По теме» снимает ручной выбор и ставит data-splash', async () => {
    const [themed, variant] = Object.entries(THEME_LOADER).find(([, v]) => v !== 'flame')!
    setTheme(themed)
    localStorage.setItem(SPLASH_VARIANT_KEY, 'classic')
    const w = mount(SplashPicker)
    expect(w.find('[data-testid="splash-auto"]').attributes('data-active')).toBe('false')
    await w.find('[data-testid="splash-auto"] [data-testid="splash-choose"]').trigger('click')
    expect(localStorage.getItem(SPLASH_VARIANT_KEY)).toBeNull()
    expect(document.documentElement.getAttribute('data-splash')).toBe(variant)
    expect(w.find('[data-testid="splash-auto"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="splash-auto-now"]').text()).toContain(({ ring: 'Огненный круг', tongues: 'Три языка', classic: 'Классика' } as Record<string, string>)[variant] ?? '')
  })
  it('все index.html пилота несут одну и ту же карту заставок темы, равную THEME_LOADER, и запасной вариант в скрипте', () => {
    const want = '{ ' + Object.entries(THEME_LOADER).map(([k, v]) => `${k}: '${v}'`).join(', ') + ' }'
    const dirs = ['dashboard', 'goals', 'skills', 'workouts', 'calendar', 'languages', 'challenges', 'milestones', 'shop', 'community', 'achievements', 'customization', 'account', 'login', 'onboarding', 'history']
    for (const d of dirs) {
      const html: string = readFileSync(`../web-${d}/index.html`, 'utf-8')
      expect(html, d).toContain(`var tl = ${want}[t]`)
      expect(html, d).toContain("sv.indexOf(sp) >= 0 ? sp : tl || 'flame'")
      expect(html, d).toContain("'tongues', 'orbit']") // «Орбита» (BACKLOG 56.1): ключ в списке вариантов скрипта выбора
      expect(html, d).toContain('class="pre-orbit"')
    }
  })
})
