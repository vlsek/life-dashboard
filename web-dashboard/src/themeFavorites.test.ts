// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в themes.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Решение владельца 2026-10-04: список тем в левом сайдбаре показывает только «любимые» (до 4, отмечаются в «Кастомизации»),
// а «Кастомизация» стоит в сайдбаре под разделителем, рядом с «Историей».
vi.mock('./lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('site_theme', 'dark') // тесты исходят из тёмной; светлая по умолчанию — в themeDefaultAllPilots.test.ts
  document.documentElement.className = 'theme-dark'
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function mountShell() {
  const { default: AppShell } = await import('./components/AppShell.vue')
  return mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
}
const options = (w: ReturnType<typeof mount>) => w.findAll('nav select option').map((o) => o.attributes('value'))

describe('AppShell: выбор темы только из любимых', () => {
  it('по умолчанию в списке прежние четыре темы', async () => {
    const w = await mountShell()
    expect(options(w)).toEqual(['dark', 'monet', 'light', 'pink'])
    w.unmount()
  })

  it('в списке только отмеченные любимые', async () => {
    localStorage.setItem('site_theme', 'mint') // активная тема сама входит в список, поэтому берём любимую
    localStorage.setItem('unlocked_themes', JSON.stringify(['mint', 'nord', 'amoled'])) // темы-награды открыты (v3.42)
    localStorage.setItem('favorite_themes', JSON.stringify(['mint', 'nord', 'amoled', 'contrast']))
    const w = await mountShell()
    expect(options(w)).toEqual(['mint', 'nord', 'amoled', 'contrast'])
    w.unmount()
  })

  it('активная тема остаётся в списке, даже если она не любимая, и выбрана в select', async () => {
    localStorage.setItem('site_theme', 'sepia')
    localStorage.setItem('favorite_themes', JSON.stringify(['dark', 'light']))
    const w = await mountShell()
    expect(options(w)).toEqual(['dark', 'light', 'sepia'])
    expect((w.find('nav select').element as HTMLSelectElement).value).toBe('sepia')
    w.unmount()
  })

  it('смена любимых в «Кастомизации» (событие) сразу обновляет список', async () => {
    const w = await mountShell()
    localStorage.setItem('unlocked_themes', JSON.stringify(['mocha']))
    localStorage.setItem('favorite_themes', JSON.stringify(['mocha', 'dark']))
    window.dispatchEvent(new Event('favorite-themes:changed'))
    await w.vm.$nextTick()
    expect(options(w)).toEqual(['mocha', 'dark'])
    w.unmount()
  })

  it('выбор темы из списка применяет её', async () => {
    localStorage.setItem('unlocked_themes', JSON.stringify(['mint']))
    localStorage.setItem('favorite_themes', JSON.stringify(['dark', 'mint']))
    const w = await mountShell()
    const sel = w.find('nav select')
    ;(sel.element as HTMLSelectElement).value = 'mint'
    await sel.trigger('change')
    expect(localStorage.getItem('site_theme')).toBe('mint')
    expect(document.documentElement.classList.contains('theme-mint')).toBe(true)
    w.unmount()
  })
})

describe('AppShell: замок тем-наград (v3.42)', () => {
  it('закрытая тема-награда, отмеченная любимой, в списке не показывается, пока не открыта', async () => {
    localStorage.setItem('favorite_themes', JSON.stringify(['dark', 'mint', 'nord', 'light']))
    const w = await mountShell()
    expect(options(w)).toEqual(['dark', 'light'])
    w.unmount()
  })

  it('открытие темы (событие от шапки) сразу добавляет её в список', async () => {
    localStorage.setItem('favorite_themes', JSON.stringify(['dark', 'mint', 'light']))
    const w = await mountShell()
    expect(options(w)).toEqual(['dark', 'light'])
    localStorage.setItem('unlocked_themes', JSON.stringify(['mint']))
    window.dispatchEvent(new Event('unlocked-themes:changed'))
    await w.vm.$nextTick()
    expect(options(w)).toEqual(['dark', 'mint', 'light'])
    w.unmount()
  })

  it('уже включённая закрытая тема остаётся в списке и выбрана в select', async () => {
    localStorage.setItem('site_theme', 'amoled')
    const w = await mountShell()
    expect(options(w)).toContain('amoled')
    expect((w.find('nav select').element as HTMLSelectElement).value).toBe('amoled')
    w.unmount()
  })
})

describe('AppShell: «Кастомизация» под разделителем', () => {
  it('ссылка стоит после первой черты-разделителя, в самом низу меню; выше неё её нет; «Истории» в меню нет (объединена с «Календарём»)', async () => {
    const w = await mountShell()
    const nav = w.find('nav')
    const children = Array.from(nav.element.children) as HTMLElement[]
    const firstDivider = children.findIndex((c) => c.tagName === 'DIV' && c.className.includes('border-t'))
    expect(firstDivider).toBeGreaterThan(0)
    const hrefs = children.map((c) => (c.tagName === 'A' ? c.getAttribute('href') : null))
    const custom = hrefs.indexOf('/customization/')
    expect(custom).toBeGreaterThan(firstDivider)
    expect(hrefs).not.toContain('/history/')
    expect(hrefs.slice(custom + 1).filter((h) => h === '/customization/')).toHaveLength(0) // «Кастомизация» одна и в самом низу
    expect(hrefs.slice(0, firstDivider)).not.toContain('/customization/')
    expect(hrefs.slice(0, firstDivider)).toContain('/achievements/')
    w.unmount()
  })
})

describe('одинаково во всех страницах пилота', () => {
  const dirs: string[] = readdirSync('..').filter((d: string) => d.startsWith('web-') && existsSync(`../${d}/src/components/AppShell.vue`))
  it('нашлись все 14 страниц с боковым меню', () => {
    expect(dirs.length).toBeGreaterThanOrEqual(14)
  })
  it.each(dirs)('%s: любимые темы в списке и «Кастомизация» под разделителем', (dir: string) => {
    const src: string = readFileSync(`../${dir}/src/components/AppShell.vue`, 'utf-8')
    // в календаре владелец сам убрал дублирующий пункт «История» (коммит 9c21287, 2026-10-06 18:28): там внизу только «Кастомизация»
    // «История» объединена с «Календарём» (решение владельца 2026-10-06): в нижнем блоке меню у ВСЕХ страниц только «Кастомизация»
    expect(src).toContain("const BOTTOM_KEYS = ['customization']")
    expect(src).not.toContain("key: 'history'")
    expect(src).toContain('<option v-for="key in themeOptions"')
    expect(src).toContain('visibleThemes(themeVal.value)')
    expect(src).toContain('FAVORITE_THEMES_EVENT')
    expect(src).toContain('UNLOCKED_THEMES_EVENT') // меню перерисуется, когда шапка откроет тему-награду
    expect(src).not.toContain('in THEME_KEYS"')
    expect(readFileSync(`../${dir}/src/lib/theme.ts`, 'utf-8')).toBe(readFileSync('src/lib/theme.ts', 'utf-8'))
  })
})
