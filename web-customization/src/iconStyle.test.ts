import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import IconStylePicker from './components/IconStylePicker.vue'
import { applyIconStyle, ICON_STYLES, ICON_STYLE_KEY, ICON_STYLE_RULES, iconStyleCss, readIconStyle, writeIconStyle } from './lib/iconStyle'
import { PREF_KEYS } from './lib/looks'
import { selectionRows } from './lib/currentSelection'
import { SLOTS, freeTotal, slotOf } from './lib/slots'

async function fsMod(): Promise<{ readFileSync: (p: string, enc: string) => string; readdirSync: (p: string) => string[]; existsSync: (p: string) => boolean }> {
  return (await import(/* @vite-ignore */ 'node:' + 'fs')) as never
}
const ROOT = '../' // vitest запускается из каталога пилота (web-customization)

// BACKLOG 44.18г: «Стиль иконок» — как выглядят все иконки на всех страницах (одобрено владельцем 2026-10-19).
describe('реестр и хранение', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-icon-style')
  })
  it('пять стилей, по умолчанию «Контур»; мусор в хранилище игнорируется', () => {
    expect([...ICON_STYLES]).toEqual(['outline', 'thin', 'bold', 'square', 'shadow'])
    expect(readIconStyle()).toBe('outline')
    localStorage.setItem(ICON_STYLE_KEY, 'neon')
    expect(readIconStyle()).toBe('outline')
  })
  it('запись стиля сразу ставит атрибут на <html>; «Контур» снимает и атрибут, и ключ (по умолчанию — «нет значения»)', () => {
    expect(writeIconStyle('bold')).toBe(true)
    expect(localStorage.getItem(ICON_STYLE_KEY)).toBe('bold')
    expect(document.documentElement.getAttribute('data-icon-style')).toBe('bold')
    writeIconStyle('square')
    expect(document.documentElement.getAttribute('data-icon-style')).toBe('square')
    expect(writeIconStyle('outline')).toBe(true)
    expect(localStorage.getItem(ICON_STYLE_KEY)).toBeNull()
    expect(document.documentElement.hasAttribute('data-icon-style')).toBe(false)
  })
  it('applyIconStyle() без аргумента берёт сохранённое (как при загрузке страницы)', () => {
    localStorage.setItem(ICON_STYLE_KEY, 'thin')
    applyIconStyle()
    expect(document.documentElement.getAttribute('data-icon-style')).toBe('thin')
  })
})

describe('CSS-правила: единый источник и страж', () => {
  it('«Контур» правил не имеет (внешний вид по умолчанию не меняется); остальные меняют ровно своё', () => {
    expect(Object.keys(ICON_STYLE_RULES)).toEqual(['thin', 'bold', 'square', 'shadow'])
    const css = iconStyleCss()
    expect(css).not.toContain("'outline'")
    expect(css).toContain("html[data-icon-style='thin'] svg[viewBox='0 0 24 24'][stroke='currentColor'] { stroke-width: 1.2; }")
    expect(css).toContain('stroke-linecap: butt; stroke-linejoin: miter;')
    expect(css).toContain('filter: drop-shadow(')
    expect(ICON_STYLE_RULES.thin.strokeWidth!).toBeLessThan(1.9) // тоньше «Контура»
    expect(ICON_STYLE_RULES.bold.strokeWidth!).toBeGreaterThan(1.9) // толще «Контура»
  })
  it('в style.css КАЖДОГО пилота стоит блок icon-style, точно совпадающий с iconStyleCss() (генерирует apply_themes.py)', async () => {
    const fs = await fsMod()
    const pilots = fs.readdirSync(ROOT).filter((d) => d.startsWith('web-') && fs.existsSync(ROOT + d + '/src/lib/theme.ts'))
    expect(pilots.length).toBeGreaterThanOrEqual(15)
    for (const d of pilots) {
      const css = fs.readFileSync(ROOT + d + '/src/style.css', 'utf-8')
      const a = css.indexOf('/* icon-style:start')
      const b = css.indexOf('/* icon-style:end */')
      expect(a, d + ': нет icon-style:start').toBeGreaterThan(-1)
      const body = css.slice(css.indexOf('\n', a) + 1, b).trim()
      expect(body, d).toBe(iconStyleCss())
    }
  })
  it('в index.html КАЖДОГО пилота до первой отрисовки ставится data-icon-style; допустимы только четыре «не контур» значения', async () => {
    const fs = await fsMod()
    const pilots = fs.readdirSync(ROOT).filter((d) => d.startsWith('web-') && fs.existsSync(ROOT + d + '/src/lib/theme.ts'))
    for (const d of pilots) {
      const html = fs.readFileSync(ROOT + d + '/index.html', 'utf-8')
      expect(html, d).toContain("localStorage.getItem('icon_style')")
      expect(html, d).toContain("['thin', 'bold', 'square', 'shadow'].indexOf(is) >= 0")
      expect(html.indexOf("localStorage.getItem('icon_style')"), d).toBeLessThan(html.indexOf('</head>')) // в <head>, а не после
      expect(html.split("localStorage.getItem('icon_style')").length - 1, d).toBe(1) // не продублирован
    }
  })
  it('шапка синхронизирует ключ между устройствами (SYNC_KEYS), образ запоминает стиль (PREF_KEYS)', async () => {
    const fs = await fsMod()
    expect(fs.readFileSync(ROOT + 'web-header/src/lib/uiSettingsSync.ts', 'utf-8')).toContain("'icon_style',")
    expect(PREF_KEYS).toContain(ICON_STYLE_KEY)
  })
})

describe('слот в Кастомизации', () => {
  it('слот iconstyle: бесплатный, в группе «Внешний вид», число вариантов — от реестра', () => {
    const s = slotOf('iconstyle')!
    expect(s.kind).toBe('free')
    expect(s.group).toBe('look')
    expect(freeTotal('iconstyle')).toBe(ICON_STYLES.length)
    expect(SLOTS.filter((x) => x.id === 'iconstyle')).toHaveLength(1)
  })
  it('«Сейчас выбрано»: строка стиля иконок; подсвечена, только если выбран не «Контур»', () => {
    const base = { theme: 'dark', selected: {}, splash: 'auto', streakFlame: 'flame', waterAnim: 'auto', bodyModel: null, chartMarker: 'flat', chart: { kind: 'line', line: 'line', anim: 'none', forecast: 'off', goalZone: 'off', sparks: 'off' } } as never
    const row = (r: unknown) => (selectionRows(r as never) as { section: string; valueKey: string; custom: boolean }[]).find((x) => x.section === 'iconstyle')!
    expect(row(base)).toMatchObject({ valueKey: 'cust_iconstyle_outline', custom: false })
    expect(row({ ...(base as object), iconStyle: 'bold' })).toMatchObject({ valueKey: 'cust_iconstyle_bold', custom: true })
  })
})

describe('пикер', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    document.documentElement.removeAttribute('data-icon-style')
  })
  it('пять карточек, по умолчанию «Контур»; в каждой пять разных иконок; подписи RU/EN', () => {
    const w = mount(IconStylePicker)
    expect(w.findAll('[data-testid^="iconstyle-"][data-active]')).toHaveLength(5)
    expect(w.find('[data-testid="iconstyle-outline"]').attributes('data-active')).toBe('true')
    for (const v of ICON_STYLES) expect(w.find(`[data-testid="iconstyle-${v}"] [data-testid="iconstyle-preview"]`).findAll('svg')).toHaveLength(5)
    for (const label of ['Контур', 'Тонкий', 'Жирный', 'Угловатый', 'Двойной штрих']) expect(w.text()).toContain(label)
    localStorage.setItem('site_lang', 'en')
    const en = mount(IconStylePicker)
    for (const label of ['Outline', 'Thin', 'Bold', 'Angular', 'Double stroke']) expect(en.text()).toContain(label)
  })
  it('предпросмотр рисуется теми же значениями, что в CSS: толщина, концы штриха, тень', () => {
    const w = mount(IconStylePicker)
    const first = (v: string) => w.find(`[data-testid="iconstyle-${v}"] svg`)
    expect(first('outline').attributes('stroke-width')).toBe('1.9')
    expect(first('thin').attributes('stroke-width')).toBe(String(ICON_STYLE_RULES.thin.strokeWidth))
    expect(first('bold').attributes('stroke-width')).toBe(String(ICON_STYLE_RULES.bold.strokeWidth))
    expect(first('square').attributes('stroke-linecap')).toBe('butt')
    expect(first('square').attributes('stroke-linejoin')).toBe('miter')
    expect(first('shadow').attributes('style')).toContain('drop-shadow')
    expect(first('outline').attributes('style')).toBeUndefined()
  })
  it.each(['thin', 'bold', 'square', 'shadow'] as const)('«Выбрать» для «%s»: пишет ключ, сразу ставит атрибут на <html>, переключает карточку', async (v) => {
    const w = mount(IconStylePicker)
    await w.find(`[data-testid="iconstyle-${v}"] [data-testid="iconstyle-choose"]`).trigger('click')
    expect(localStorage.getItem('icon_style')).toBe(v)
    expect(document.documentElement.getAttribute('data-icon-style')).toBe(v)
    expect(w.find(`[data-testid="iconstyle-${v}"]`).attributes('data-active')).toBe('true')
    expect(w.find('[data-testid="iconstyle-outline"]').attributes('data-active')).toBe('false')
    for (const k of ['chart_kind', 'chart_marker', 'streak_flame_variant', 'splash_variant']) expect(localStorage.getItem(k), k).toBeNull()
  })
  it('вернуть «Контур»: ключ и атрибут снимаются', async () => {
    const w = mount(IconStylePicker)
    await w.find('[data-testid="iconstyle-bold"] [data-testid="iconstyle-choose"]').trigger('click')
    await w.find('[data-testid="iconstyle-outline"] [data-testid="iconstyle-choose"]').trigger('click')
    expect(localStorage.getItem('icon_style')).toBeNull()
    expect(document.documentElement.hasAttribute('data-icon-style')).toBe(false)
  })
})
