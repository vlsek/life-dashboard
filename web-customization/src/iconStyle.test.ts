import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import IconStylePicker from './components/IconStylePicker.vue'
import { applyIconStyle, ICON_STYLES, ICON_STYLE_KEY, readIconStyle, resetPackCacheForTests, setPackFetcher, writeIconStyle } from './lib/iconStyle'
import { PREF_KEYS } from './lib/looks'
import { selectionRows } from './lib/currentSelection'
import { SLOTS, freeTotal, slotOf } from './lib/slots'

async function fsMod(): Promise<{ readFileSync: (p: string, enc: string) => string; readdirSync: (p: string) => string[]; existsSync: (p: string) => boolean }> {
  return (await import(/* @vite-ignore */ 'node:' + 'fs')) as never
}
const ROOT = '../' // vitest запускается из каталога пилота (web-customization)

// BACKLOG 44.18г (срез 3): «Стиль иконок» — НАБОРЫ с другой графикой (Контур / Заливка / Дуотон / Пиксели).
describe('реестр и хранение', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-icon-style')
  })
  it('четыре набора, по умолчанию «Контур»; мусор и прежние стили штриха (thin/bold/square/shadow) читаются как «Контур»', () => {
    expect([...ICON_STYLES]).toEqual(['outline', 'fill', 'duotone', 'pixel', 'sketch'])
    expect(readIconStyle()).toBe('outline')
    for (const old of ['neon', 'thin', 'bold', 'square', 'shadow']) {
      localStorage.setItem(ICON_STYLE_KEY, old)
      expect(readIconStyle(), old).toBe('outline')
    }
  })
  it('запись набора сразу ставит атрибут на <html>; «Контур» снимает и атрибут, и ключ', () => {
    expect(writeIconStyle('fill')).toBe(true)
    expect(localStorage.getItem(ICON_STYLE_KEY)).toBe('fill')
    expect(document.documentElement.getAttribute('data-icon-style')).toBe('fill')
    writeIconStyle('pixel')
    expect(document.documentElement.getAttribute('data-icon-style')).toBe('pixel')
    expect(writeIconStyle('outline')).toBe(true)
    expect(localStorage.getItem(ICON_STYLE_KEY)).toBeNull()
    expect(document.documentElement.hasAttribute('data-icon-style')).toBe(false)
  })
  it('applyIconStyle() без аргумента берёт сохранённое (как при загрузке страницы)', () => {
    localStorage.setItem(ICON_STYLE_KEY, 'duotone')
    applyIconStyle()
    expect(document.documentElement.getAttribute('data-icon-style')).toBe('duotone')
  })
})

describe('страницы и данные', () => {
  it('в index.html КАЖДОГО пилота до первой отрисовки ставится data-icon-style; допустимы только четыре «не контур» набора', async () => {
    const fs = await fsMod()
    const pilots = fs.readdirSync(ROOT).filter((d) => d.startsWith('web-') && fs.existsSync(ROOT + d + '/src/lib/theme.ts'))
    expect(pilots.length).toBeGreaterThanOrEqual(15)
    for (const d of pilots) {
      const html = fs.readFileSync(ROOT + d + '/index.html', 'utf-8')
      expect(html, d).toContain("localStorage.getItem('icon_style')")
      expect(html, d).toContain("['fill', 'duotone', 'pixel', 'sketch'].indexOf(is) >= 0")
      expect(html.indexOf("localStorage.getItem('icon_style')"), d).toBeLessThan(html.indexOf('</head>'))
      expect(html.split("localStorage.getItem('icon_style')").length - 1, d).toBe(1)
    }
  })
  it('в style.css пилотов НЕТ блока прежних стилей штриха (его удалил apply_themes.py)', async () => {
    const fs = await fsMod()
    const pilots = fs.readdirSync(ROOT).filter((d) => d.startsWith('web-') && fs.existsSync(ROOT + d + '/src/lib/theme.ts'))
    for (const d of pilots) expect(fs.readFileSync(ROOT + d + '/src/style.css', 'utf-8'), d).not.toContain('icon-style:start')
  })
  it('файлы наборов есть и содержат иконки; пикер и подменщик берут их из одного места', async () => {
    const fs = await fsMod()
    for (const s of ICON_STYLES.filter((x) => x !== 'outline')) {
      const j = JSON.parse(fs.readFileSync(ROOT + 'web-header/public/icon-packs/' + s + '.json', 'utf-8')) as { icons: Record<string, unknown> }
      expect(Object.keys(j.icons).length, s).toBeGreaterThan(100)
    }
  })
  it('шапка синхронизирует ключ между устройствами (SYNC_KEYS), образ запоминает набор (PREF_KEYS)', async () => {
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
    expect(row({ ...(base as object), iconStyle: 'fill' })).toMatchObject({ valueKey: 'cust_iconstyle_fill', custom: true })
  })
})

describe('пикер', () => {
  const ICONS = Object.fromEntries(['home', 'goals', 'dumbbell', 'droplet', 'star'].map((n) => [n, { vb: '0 0 256 256', h: '<path d="M0 0h8v8z"/>' }]))
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    document.documentElement.removeAttribute('data-icon-style')
    resetPackCacheForTests()
    setPackFetcher(async () => ({ icons: ICONS }))
  })
  it('четыре карточки, по умолчанию «Контур»; в каждой пять иконок; подписи RU/EN', () => {
    const w = mount(IconStylePicker)
    expect(w.findAll('[data-testid^="iconstyle-"][data-active]')).toHaveLength(5)
    expect(w.find('[data-testid="iconstyle-outline"]').attributes('data-active')).toBe('true')
    for (const v of ICON_STYLES) expect(w.find(`[data-testid="iconstyle-${v}"] [data-testid="iconstyle-preview"]`).findAll('svg')).toHaveLength(5)
    for (const label of ['Контур', 'Заливка', 'Дуотон', 'Пиксели', 'Рукописный']) expect(w.text()).toContain(label)
    localStorage.setItem('site_lang', 'en')
    const en = mount(IconStylePicker)
    for (const label of ['Outline', 'Solid', 'Duotone', 'Pixels', 'Sketch']) expect(en.text()).toContain(label)
  })
  it('предпросмотр берёт данные набора (после загрузки), а «Контур» рисуется штрихом; до загрузки и без сети — «Контур»', async () => {
    const w = mount(IconStylePicker)
    await new Promise((r) => setTimeout(r, 0))
    await w.vm.$nextTick()
    const first = (v: string) => w.find(`[data-testid="iconstyle-${v}"] svg`)
    expect(first('outline').attributes('stroke-width')).toBe('1.9')
    expect(first('fill').attributes('viewBox')).toBe('0 0 256 256')
    expect(first('fill').attributes('data-pack')).toBe('fill')
    expect(first('pixel').attributes('data-ip-skip')).toBeDefined()
    resetPackCacheForTests()
    setPackFetcher(async () => {
      throw new Error('offline')
    })
    const off = mount(IconStylePicker)
    await new Promise((r) => setTimeout(r, 0))
    expect(off.find('[data-testid="iconstyle-fill"] svg').attributes('data-pack')).toBe('outline')
  })
  it.each(['fill', 'duotone', 'pixel', 'sketch'] as const)('«Выбрать» для «%s»: пишет ключ, сразу ставит атрибут на <html>, переключает карточку', async (v) => {
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
    await w.find('[data-testid="iconstyle-fill"] [data-testid="iconstyle-choose"]').trigger('click')
    await w.find('[data-testid="iconstyle-outline"] [data-testid="iconstyle-choose"]').trigger('click')
    expect(localStorage.getItem('icon_style')).toBeNull()
    expect(document.documentElement.hasAttribute('data-icon-style')).toBe(false)
  })
})
