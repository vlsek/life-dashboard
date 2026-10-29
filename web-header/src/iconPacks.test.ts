// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в designTokens.test.ts)
import { readFileSync, existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ICON_STYLE_ATTR, ICON_STYLE_EVENT, PACK_STYLES, applyIconPack, normalizeMarkup, resetIconPacksForTests, restoreIcon, setIconPackFetcher, startIconPacks, swapIcon, type PackData } from './lib/iconPacks'

// BACKLOG 44.18г срез 3: наборы иконок («Заливка», «Дуотон», «Пиксели») — рантайм-подменщик в шапке.
const HOME = '<path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" />'
const STAR = '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />'
const INDEX = { icons: { home: HOME, star: STAR } }
const FILL: { icons: PackData } = { icons: { home: { vb: '0 0 256 256', h: '<path d="M1 1"/>' }, star: { vb: '0 0 256 256', h: '<path d="M2 2"/>' } } }
const PIXEL: { icons: PackData } = { icons: { home: { vb: '0 0 16 16', h: '<path d="M0 0h1v1h-1z"/>', a: { 'shape-rendering': 'crispEdges' } } } }
const DATA: Record<string, unknown> = { index: INDEX, fill: FILL, duotone: FILL, pixel: PIXEL }
let fetched: string[] = []
const fakeFetcher = async (url: string) => {
  const key = url.split('/').pop()!.replace('.json', '')
  fetched.push(key)
  if (!(key in DATA)) throw new Error('404')
  return DATA[key]
}
const icon = (markup: string, extra = '') =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ${extra}>${markup}</svg>`
const html = () => document.documentElement
const setStyle = (v: string | null) => (v === null ? html().removeAttribute(ICON_STYLE_ATTR) : html().setAttribute(ICON_STYLE_ATTR, v))
const tick = () => new Promise((r) => setTimeout(r, 40))

beforeEach(() => {
  resetIconPacksForTests()
  setIconPackFetcher(fakeFetcher)
  fetched = []
  document.body.innerHTML = ''
  setStyle(null)
})
afterEach(() => setStyle(null))

describe('подмена одной иконки', () => {
  it('«Контур» → набор: viewBox и заливка набора, штрих снят, разметка заменена; откат возвращает ВСЁ как было', () => {
    document.body.innerHTML = icon(HOME)
    const svg = document.querySelector('svg')!
    const before = svg.outerHTML
    const index = new Map([[normalizeMarkup(HOME), 'home']])
    expect(swapIcon(svg, 'fill', FILL.icons, index)).toBe(true)
    expect(svg.getAttribute('viewBox')).toBe('0 0 256 256')
    expect(svg.getAttribute('fill')).toBe('currentColor')
    for (const k of ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) expect(svg.hasAttribute(k), k).toBe(false)
    expect(svg.innerHTML).toBe('<path d="M1 1"></path>')
    expect(svg.getAttribute('data-ip')).toBe('fill')
    expect(svg.getAttribute('class')).toBe('icon') // чужие атрибуты (класс, размер) не тронуты
    restoreIcon(svg)
    expect(svg.outerHTML).toBe(before)
  })
  it('дополнительные атрибуты набора («Пиксели»: crispEdges) ставятся и при откате снимаются', () => {
    document.body.innerHTML = icon(HOME)
    const svg = document.querySelector('svg')!
    swapIcon(svg, 'pixel', PIXEL.icons, new Map([[normalizeMarkup(HOME), 'home']]))
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges')
    restoreIcon(svg)
    expect(svg.hasAttribute('shape-rendering')).toBe(false)
  })
  it('иконка без пары в наборе и незнакомая разметка остаются «Контуром» (помечаются, повторно не ищутся)', () => {
    document.body.innerHTML = icon(STAR) + icon('<circle cx="1" cy="1" r="1" />')
    const [a, b] = [...document.querySelectorAll('svg')]
    const index = new Map([[normalizeMarkup(STAR), 'star']])
    expect(swapIcon(a, 'pixel', PIXEL.icons, index)).toBe(false) // в пиксельном наборе звезды нет
    expect(swapIcon(b, 'pixel', PIXEL.icons, index)).toBe(false)
    expect(a.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(a.getAttribute('stroke')).toBe('currentColor')
    expect(a.getAttribute('data-ip')).toBe('-')
  })
})

describe('страница: applyIconPack', () => {
  it('без атрибута и с неизвестным (прежние thin/bold/square/shadow) — ничего не грузится и не меняется', async () => {
    document.body.innerHTML = icon(HOME)
    for (const v of [null, 'thin', 'bold', 'square', 'shadow', 'outline', 'neon']) {
      setStyle(v)
      await applyIconPack()
    }
    expect(fetched).toEqual([])
    expect(document.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 24 24')
  })
  it('data-icon-style=fill: грузятся индекс и ТОЛЬКО выбранный набор, все узнанные иконки подменены', async () => {
    document.body.innerHTML = icon(HOME) + icon(STAR)
    setStyle('fill')
    await applyIconPack()
    expect(fetched.sort()).toEqual(['fill', 'index'])
    const svgs = [...document.querySelectorAll('svg')]
    expect(svgs.map((s) => s.getAttribute('data-ip'))).toEqual(['fill', 'fill'])
    expect(svgs.every((s) => s.getAttribute('viewBox') === '0 0 256 256')).toBe(true)
  })
  it('смена набора: сначала всё к «Контуру», потом новый; снятие атрибута — полный откат', async () => {
    document.body.innerHTML = icon(HOME) + icon(STAR)
    const before = document.body.innerHTML
    setStyle('fill')
    await applyIconPack()
    setStyle('pixel')
    await applyIconPack()
    const [home, star] = [...document.querySelectorAll('svg')]
    expect(home.getAttribute('data-ip')).toBe('pixel')
    expect(home.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(star.getAttribute('viewBox')).toBe('0 0 24 24') // в пиксельном наборе звезды нет — осталась «Контуром»
    setStyle(null)
    await applyIconPack()
    expect(document.body.innerHTML).toBe(before)
  })
  it('нет сети / файла: страница остаётся «Контуром», ошибки не летят, следующая попытка пробует снова', async () => {
    document.body.innerHTML = icon(HOME)
    setIconPackFetcher(async () => {
      throw new Error('offline')
    })
    setStyle('duotone')
    await expect(applyIconPack()).resolves.toBeUndefined()
    expect(document.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 24 24')
    setIconPackFetcher(fakeFetcher)
    await applyIconPack()
    expect(document.querySelector('svg')!.getAttribute('data-ip')).toBe('duotone')
  })
  it('выбор сменился, пока грузился набор, — устаревший ответ не применяется', async () => {
    document.body.innerHTML = icon(HOME)
    let release: () => void = () => {}
    const gate = new Promise<void>((r) => (release = r))
    setIconPackFetcher(async (url) => {
      await gate
      return fakeFetcher(url)
    })
    setStyle('fill')
    const p = applyIconPack()
    setStyle(null)
    const p2 = applyIconPack()
    release()
    await Promise.all([p, p2])
    expect(document.querySelector('svg')!.hasAttribute('data-ip')).toBe(false)
  })
})

describe('исключения', () => {
  it('иконка с data-ip-skip (предпросмотр в пикере «Кастомизации») не подменяется ни при включении, ни позже', async () => {
    document.body.innerHTML = icon(HOME, 'data-ip-skip') + icon(HOME)
    setStyle('fill')
    await applyIconPack()
    const [skipped, normal] = [...document.querySelectorAll('svg')]
    expect(skipped.hasAttribute('data-ip')).toBe(false)
    expect(skipped.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(normal.getAttribute('data-ip')).toBe('fill')
    document.body.insertAdjacentHTML('beforeend', icon(HOME, 'data-ip-skip'))
    await tick()
    expect(document.querySelectorAll('svg')[2].hasAttribute('data-ip')).toBe(false)
  })
})

describe('слежение за страницей', () => {
  it('иконка, появившаяся ПОСЛЕ включения (Vue дорисовал), подменяется сама', async () => {
    setStyle('fill')
    await applyIconPack()
    document.body.insertAdjacentHTML('beforeend', icon(HOME))
    await tick()
    expect(document.querySelector('svg')!.getAttribute('data-ip')).toBe('fill')
  })
  it('Vue заменил разметку у уже подменённой иконки на другую («Контур» звезды) — она подменяется заново на правильную', async () => {
    document.body.innerHTML = icon(HOME)
    setStyle('fill')
    await applyIconPack()
    const svg = document.querySelector('svg')!
    svg.innerHTML = STAR // как при patch v-html: внутри снова «Контур», а атрибуты ещё от набора
    await tick()
    expect(svg.innerHTML).toBe('<path d="M2 2"></path>')
    expect(svg.getAttribute('data-ip')).toBe('fill')
  })
  it('событие icon-style-change применяет выбор на открытой странице без перезагрузки', async () => {
    document.body.innerHTML = icon(HOME)
    startIconPacks()
    await tick()
    expect(document.querySelector('svg')!.hasAttribute('data-ip')).toBe(false)
    setStyle('pixel')
    document.dispatchEvent(new Event(ICON_STYLE_EVENT))
    await tick()
    expect(document.querySelector('svg')!.getAttribute('data-ip')).toBe('pixel')
    setStyle(null)
    document.dispatchEvent(new Event(ICON_STYLE_EVENT))
    await tick()
    expect(document.querySelector('svg')!.hasAttribute('data-ip')).toBe(false)
    expect(document.querySelector('svg')!.getAttribute('stroke')).toBe('currentColor')
  })
})

const DIR = 'public/icon-packs/'
describe('настоящие данные наборов (web-header/public/icon-packs)', () => {
  const have = existsSync(DIR + 'index.json')
  const read = (n: string) => JSON.parse(readFileSync(DIR + n + '.json', 'utf-8'))
  it('файлы на месте и это ровно те наборы, что знает подменщик', () => {
    expect(have).toBe(true)
    for (const s of PACK_STYLES) expect(existsSync(DIR + s + '.json'), s).toBe(true)
  })
  it('index: ≥130 иконок, разметка у каждого имени своя (иначе «по разметке» нельзя узнать иконку)', () => {
    const idx = read('index').icons as Record<string, string>
    expect(Object.keys(idx).length).toBeGreaterThanOrEqual(130)
    const seen = new Map<string, string>()
    for (const [name, markup] of Object.entries(idx)) {
      const key = normalizeMarkup(markup)
      expect(markup, name).not.toContain('\\')
      expect(seen.get(key), `${name} совпадает с ${seen.get(key)}`).toBeUndefined()
      seen.set(key, name)
    }
  })
  it('наборы: имена только из index, у каждой записи есть viewBox и разметка; «Пиксели» покрывают ВСЕ иконки, «Заливка» и «Дуотон» — не меньше 125', () => {
    const names = Object.keys(read('index').icons)
    for (const s of PACK_STYLES) {
      const icons = read(s).icons as PackData
      const have = Object.keys(icons)
      for (const n of have) {
        expect(names, `${s}/${n}`).toContain(n)
        expect(icons[n].vb, `${s}/${n}`).toMatch(/^0 0 \d+ \d+$/)
        expect(icons[n].h.length, `${s}/${n}`).toBeGreaterThan(10)
      }
      if (s === 'pixel' || s === 'sketch') expect(have.length).toBe(names.length)
      else expect(have.length).toBeGreaterThanOrEqual(125)
    }
  })
  it('«Пиксели» рисуются без размытия (crispEdges у каждой записи) на сетке 16×16', () => {
    for (const [n, e] of Object.entries(read('pixel').icons as PackData)) {
      expect(e.vb, n).toBe('0 0 16 16')
      expect(e.a, n).toEqual({ 'shape-rendering': 'crispEdges' })
    }
  })
  it('«Рукописный»: рисуется штрихом на сетке 24×24 (fill none, stroke currentColor), без зависимости от стилей страницы', () => {
    for (const [n, e] of Object.entries(read('sketch').icons as PackData)) {
      expect(e.vb, n).toBe('0 0 24 24')
      expect(e.a, n).toMatchObject({ fill: 'none', stroke: 'currentColor', 'stroke-linecap': 'round' })
    }
  })
  it('лицензии: у Phosphor-наборов указана MIT, а файл со сторонними лицензиями лежит в репозитории', () => {
    expect(read('fill').license).toContain('MIT')
    expect(read('duotone').license).toContain('MIT')
    expect(existsSync('../docs/THIRD_PARTY_ICONS.md')).toBe(true)
  })
})
