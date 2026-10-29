// Наборы иконок (BACKLOG 44.18г, срез 3): «Заливка» / «Дуотон» (Phosphor Icons, MIT) и «Пиксели» (наши иконки на сетке 16×16) вместо стилей «потолще/потоньше».
// Рантайм-подменщик: страница рисует иконки как раньше («Контур», 18 копий Icon.vue не правятся), а здесь, в шапке (она есть на каждой странице), иконку узнают
// ПО РАЗМЕТКЕ (index.json: имя → разметка «Контура»), берут её вариант из выбранного набора (fill.json / duotone.json / pixel.json) и подставляют.
// Выбор — атрибут <html data-icon-style="fill|duotone|pixel"> (его до первой отрисовки ставит скрипт в <head>, а на открытой странице — Кастомизация и событие
// `icon-style-change`). Иконки без пары в наборе остаются «Контуром». Нет сети/файла — тоже «Контур» (страница не ломается).
// Данные наборов генерирует scripts/gen_icon_packs.py (лежат в web-header/public/icon-packs/, Vite копирует их в /header-widgets/icon-packs/).

export const PACK_STYLES = ['fill', 'duotone', 'pixel', 'sketch', 'accent'] as const
export type PackStyle = (typeof PACK_STYLES)[number]
export const ICON_STYLE_ATTR = 'data-icon-style'
export const ICON_STYLE_EVENT = 'icon-style-change'
const BASE = '/header-widgets/icon-packs/'
const SVG_NS = 'http://www.w3.org/2000/svg'
// Иконка из Icon.vue / iconSvg(): 24×24, штрих currentColor. Подменённая (viewBox/штрих другие) под этот селектор уже не попадает.
const SIGNATURE = "svg[viewBox='0 0 24 24'][stroke='currentColor']"
// Иконка с атрибутом data-ip-skip (предпросмотры в пикере «Кастомизации») не подменяется: карточка «Контур» должна показывать «Контур» при любом выбранном наборе.
const MARK = 'data-ip' // имя набора у подменённой иконки; «-» — иконка без пары в наборе (повторно не ищем)

export interface PackEntry {
  vb: string
  h: string
  a?: Record<string, string>
}
export type PackData = Record<string, PackEntry>

export const isPackStyle = (v: unknown): v is PackStyle => (PACK_STYLES as readonly unknown[]).includes(v)

type Fetcher = (url: string) => Promise<unknown>
let fetcher: Fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return r.json()
  })
export function setIconPackFetcher(f: Fetcher): void {
  fetcher = f
}

// Разметка в том виде, в каком её отдаёт браузер (`<path d="…"></path>`), — чтобы сравнивать со строками из ICON_PATHS (`<path d="…" />`).
export function normalizeMarkup(markup: string): string {
  const scratch = document.createElementNS(SVG_NS, 'svg')
  scratch.innerHTML = markup
  return scratch.innerHTML
}

let indexP: Promise<Map<string, string>> | null = null
const packP = new Map<PackStyle, Promise<PackData>>()

function loadIndex(): Promise<Map<string, string>> {
  if (!indexP) {
    indexP = fetcher(BASE + 'index.json')
      .then((j) => {
        const m = new Map<string, string>()
        for (const [name, markup] of Object.entries((j as { icons: Record<string, string> }).icons)) m.set(normalizeMarkup(markup), name)
        return m
      })
      .catch((e) => {
        indexP = null // не запоминаем неудачу: следующая попытка (другая страница/выбор) сходит заново
        throw e
      })
  }
  return indexP
}
function loadPack(s: PackStyle): Promise<PackData> {
  let p = packP.get(s)
  if (!p) {
    p = fetcher(BASE + s + '.json')
      .then((j) => (j as { icons: PackData }).icons)
      .catch((e) => {
        packP.delete(s)
        throw e
      })
    packP.set(s, p)
  }
  return p
}

interface Orig {
  attrs: Record<string, string | null>
  html: string
  extra: string[]
}
const ORIG_ATTRS = ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'] as const
const ORIG = new WeakMap<Element, Orig>()
const SEEN = new WeakMap<Element, string>() // innerHTML, который мы оставили в иконке (подменённой или «-»): отличается — иконку перерисовали, проверяем заново

export function restoreIcon(svg: Element, keepHtml = false): void {
  const o = ORIG.get(svg)
  if (o) {
    for (const k of ORIG_ATTRS) {
      const v = o.attrs[k]
      if (v === null || v === undefined) svg.removeAttribute(k)
      else svg.setAttribute(k, v)
    }
    for (const k of o.extra) svg.removeAttribute(k)
    if (!keepHtml) svg.innerHTML = o.html
    ORIG.delete(svg)
  }
  svg.removeAttribute(MARK)
  SEEN.delete(svg)
}

export function swapIcon(svg: Element, style: PackStyle, pack: PackData, index: Map<string, string>): boolean {
  const name = index.get(svg.innerHTML)
  const e = name ? pack[name] : undefined
  if (!e) {
    svg.setAttribute(MARK, '-')
    SEEN.set(svg, svg.innerHTML)
    return false
  }
  const attrs: Record<string, string | null> = {}
  for (const k of ORIG_ATTRS) attrs[k] = svg.getAttribute(k)
  ORIG.set(svg, { attrs, html: svg.innerHTML, extra: Object.keys(e.a ?? {}) })
  svg.setAttribute('viewBox', e.vb)
  svg.setAttribute('fill', 'currentColor')
  for (const k of ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) svg.removeAttribute(k)
  for (const [k, v] of Object.entries(e.a ?? {})) svg.setAttribute(k, v)
  svg.innerHTML = e.h
  svg.setAttribute(MARK, style)
  SEEN.set(svg, svg.innerHTML)
  return true
}

let current: PackStyle | null = null
let data: { style: PackStyle; pack: PackData; index: Map<string, string> } | null = null
let observer: MutationObserver | null = null
let scheduled = false
const later = (f: () => void) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(f) : setTimeout(f, 16))

// Один проход: новые иконки — подменить; перерисованные страницей (Vue заменил разметку у уже подменённой) — вернуть атрибуты и подменить заново.
export function sweep(root: ParentNode = document): void {
  if (!data) return
  const { style, pack, index } = data
  root.querySelectorAll('svg[' + MARK + ']').forEach((svg) => {
    if (SEEN.get(svg) !== svg.innerHTML) {
      restoreIcon(svg, true)
    }
  })
  root.querySelectorAll(SIGNATURE + ':not([' + MARK + ']):not([data-ip-skip])').forEach((svg) => swapIcon(svg, style, pack, index))
}

function schedule() {
  if (scheduled) return
  scheduled = true
  later(() => {
    scheduled = false
    sweep()
  })
}

function restoreAll(): void {
  document.querySelectorAll('svg[' + MARK + ']').forEach((svg) => restoreIcon(svg))
}

// Приводит страницу в соответствие с <html data-icon-style>: нет/неизвестное значение (в т.ч. прежние thin/bold/…) — «Контур».
export async function applyIconPack(): Promise<void> {
  const raw = document.documentElement.getAttribute(ICON_STYLE_ATTR)
  const next = isPackStyle(raw) ? raw : null
  if (next === current && (next === null || data)) {
    if (next) sweep()
    return
  }
  restoreAll()
  data = null
  current = next
  if (!next) {
    observer?.disconnect()
    observer = null
    return
  }
  try {
    const [index, pack] = await Promise.all([loadIndex(), loadPack(next)])
    if (current !== next) return // выбор успел смениться, пока грузилось
    data = { style: next, pack, index }
  } catch {
    current = null // нет сети/файла — остаёмся на «Контуре», следующий вызов попробует снова
    return
  }
  sweep()
  if (!observer && document.body) {
    observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
  }
}

let started = false
export function startIconPacks(): void {
  if (started) return
  started = true
  void applyIconPack()
  document.addEventListener(ICON_STYLE_EVENT, () => void applyIconPack())
}

// Только для тестов: сбросить состояние модуля.
export function resetIconPacksForTests(): void {
  observer?.disconnect()
  observer = null
  current = null
  data = null
  indexP = null
  packP.clear()
  started = false
  scheduled = false
}
