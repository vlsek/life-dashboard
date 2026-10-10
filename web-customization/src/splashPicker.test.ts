import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import SplashPicker from './components/SplashPicker.vue'
import { DEFAULT_SPLASH_VARIANT, SPLASH_VARIANTS, SPLASH_VARIANT_KEY, readSplashVariant } from './lib/splashVariant'

const css: string = readFileSync('src/style.css', 'utf-8')

describe('SplashPicker: выбор заставки в «Кастомизации» (BACKLOG 16, срез 2)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    document.documentElement.removeAttribute('data-splash')
  })

  it('четыре карточки; по умолчанию выбрано «Живое пламя»; у каждой есть живой предпросмотр', () => {
    const w = mount(SplashPicker)
    expect(w.findAll('[data-testid^="splash-"][data-active]')).toHaveLength(4)
    expect(w.find('[data-testid="splash-flame"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="splash-flame"]').text()).toContain('Живое пламя')
    expect(w.find('[data-testid="splash-tongues"]').text()).toContain('Три языка')
    expect(w.find('[data-testid="splash-tongues"] svg.splash-tongues .tongue-c').exists()).toBe(true)
    expect(w.find('[data-testid="splash-ring"] svg.splash-ring').exists()).toBe(true)
    expect(w.find('[data-testid="splash-classic"] svg.splash-flame').exists()).toBe(true)
    expect(w.find('[data-testid="splash-flame"] svg.splash-live .flame-body').exists()).toBe(true)
  })

  it('выбор «Три языка» запоминается в localStorage и в data-splash; кнопка выбранного отключена', async () => {
    const w = mount(SplashPicker)
    await w.find('[data-testid="splash-tongues"] [data-testid="splash-choose"]').trigger('click')
    expect(localStorage.getItem(SPLASH_VARIANT_KEY)).toBe('tongues')
    expect(document.documentElement.getAttribute('data-splash')).toBe('tongues')
    expect(w.find('[data-testid="splash-tongues"]').attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="splash-flame"]').attributes('data-active')).toBe('false')
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
    expect(w.find('[data-testid="splash-flame"]').attributes('data-active')).toBe('true')
  })

  it('список вариантов и ключ совпадают с реестром Дашборда', () => {
    const reg = readFileSync('../web-dashboard/src/lib/splashVariants.ts', 'utf-8')
    const list = reg.match(/SPLASH_VARIANTS = \[([^\]]+)\]/)![1].replace(/['\s]/g, '').split(',')
    expect([...SPLASH_VARIANTS]).toEqual(list)
    expect(reg).toContain(`DEFAULT_SPLASH_VARIANT: SplashVariant = '${DEFAULT_SPLASH_VARIANT}'`)
    expect(reg).toContain(`SPLASH_VARIANT_KEY = '${SPLASH_VARIANT_KEY}'`)
  })

  it('CSS вариантов перенесён из Дашборда (три языка, круг, классика) и подчинён «уменьшить движение»', () => {
    for (const s of ['.splash-tongues .tongue-c', '@keyframes tongue-core', '.splash-ring .ring-base', '@keyframes ring-spin', '.splash-flame .fl-outer', '@keyframes flame-flicker'])
      expect(css, s).toContain(s)
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.splash-ring, \.splash-ring \*, \.splash-tongues \*/)
    expect(css).toContain("html[data-motion='off'] .splash-tongues *")
  })
})
