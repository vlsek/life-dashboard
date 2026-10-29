// «Стиль иконок» (BACKLOG 44.18г; срез 3 — НАБОРЫ вместо стилей штриха): как выглядят ВСЕ иконки на всех страницах. Владелец (2026-10-19): «просто больше жирнее
// или тоньше, а надо концептуально другие» — поэтому это не толщина линии, а разные наборы с другой графикой:
//   «Контур» — как сейчас (по умолчанию: ключа и атрибута нет, внешний вид не меняется);
//   «Заливка» — сплошные глифы (Phosphor Icons fill, MIT); «Дуотон» — контур и мягкая подложка вторым тоном (Phosphor duotone, MIT);
//   «Пиксели» — наши иконки, растеризованные на сетку 16×16 (8-бит).
// Выбор — localStorage `icon_style` (синхронизируется между устройствами — SYNC_KEYS шапки; входит в «Образы» — PREF_KEYS) и атрибут <html data-icon-style>
// (до первой отрисовки его ставит скрипт в <head> страниц — генерирует scripts/apply_themes.py). Подмену иконок на странице делает рантайм-подменщик в шапке
// (web-header/src/lib/iconPacks.ts; данные наборов — /header-widgets/icon-packs/*.json, генерирует scripts/gen_icon_packs.py). Прежние значения
// thin/bold/square/shadow (стили штриха, v6.29) больше не существуют и читаются как «Контур».
export const ICON_STYLES = ['outline', 'fill', 'duotone', 'pixel', 'sketch'] as const
export type IconStyle = (typeof ICON_STYLES)[number]
export const DEFAULT_ICON_STYLE: IconStyle = 'outline'
export const ICON_STYLE_KEY = 'icon_style'
export const ICON_STYLE_EVENT = 'icon-style-change'
export const ICON_PACK_BASE = '/header-widgets/icon-packs/'

export const isIconStyle = (v: unknown): v is IconStyle => (ICON_STYLES as readonly unknown[]).includes(v)

export function readIconStyle(): IconStyle {
  try {
    const v = localStorage.getItem(ICON_STYLE_KEY)
    if (isIconStyle(v)) return v
  } catch {
    /* нет localStorage — «Контур» */
  }
  return DEFAULT_ICON_STYLE
}

// Ставит/снимает атрибут на <html> и сообщает подменщику в шапке (на открытой странице иконки меняются сразу, без перезагрузки).
export function applyIconStyle(v: IconStyle = readIconStyle()): void {
  if (typeof document === 'undefined') return
  if (v === DEFAULT_ICON_STYLE) document.documentElement.removeAttribute('data-icon-style')
  else document.documentElement.setAttribute('data-icon-style', v)
  document.dispatchEvent(new Event(ICON_STYLE_EVENT))
}

// true, если выбор удалось запомнить. «Контур» — по умолчанию: ключ удаляется (на сервер синхронизации уходит «нет значения»).
export function writeIconStyle(v: IconStyle): boolean {
  try {
    if (v === DEFAULT_ICON_STYLE) localStorage.removeItem(ICON_STYLE_KEY)
    else localStorage.setItem(ICON_STYLE_KEY, v)
  } catch {
    return false
  }
  applyIconStyle(v)
  return true
}

// ----- данные наборов для предпросмотра в пикере (те же файлы, что берёт подменщик) -----
export interface PackEntry {
  vb: string
  h: string
  a?: Record<string, string>
}
export type PackIcons = Record<string, PackEntry>
type Fetcher = (url: string) => Promise<unknown>
let fetcher: Fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return r.json()
  })
export function setPackFetcher(f: Fetcher): void {
  fetcher = f
}
const packs = new Map<string, Promise<PackIcons>>()
// Только для тестов: сбросить кэш уже загруженных наборов.
export function resetPackCacheForTests(): void {
  packs.clear()
}
export function loadPackIcons(style: Exclude<IconStyle, 'outline'>): Promise<PackIcons> {
  let p = packs.get(style)
  if (!p) {
    p = fetcher(ICON_PACK_BASE + style + '.json')
      .then((j) => (j as { icons: PackIcons }).icons)
      .catch((e) => {
        packs.delete(style)
        throw e
      })
    packs.set(style, p)
  }
  return p
}
