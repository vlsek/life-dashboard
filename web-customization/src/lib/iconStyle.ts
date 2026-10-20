// «Стиль иконок» (BACKLOG 44.18г, одобрено владельцем 2026-10-19): как выглядят ВСЕ иконки на всех страницах — «Контур» (как сейчас), «Тонкий», «Жирный»,
// «Угловатый» (торцы и углы без скруглений), «Двойной штрих» (смещённая полупрозрачная копия) и «Дуотон» (мягкая заливка замкнутых фигур, срез 2). Бесплатно, выбор в localStorage `icon_style`
// (синхронизируется между устройствами — SYNC_KEYS шапки; входит в «Образы» — PREF_KEYS). «Контур» — значение по умолчанию: ключа и атрибута нет, внешний вид не меняется.
// Применение: <html data-icon-style="…"> (до первой отрисовки ставит скрипт в <head> страниц, его генерирует scripts/apply_themes.py) + один CSS-блок
// `icon-style` в style.css каждого пилота поверх зашитых атрибутов иконок (`svg[viewBox='0 0 24 24'][stroke='currentColor']`). Значения ниже — ЕДИНЫЙ источник:
// из них же строится CSS (apply_themes.py читает их тестом-стражем) и предпросмотр в пикере.
export const ICON_STYLES = ['outline', 'thin', 'bold', 'square', 'shadow', 'duotone'] as const
export type IconStyle = (typeof ICON_STYLES)[number]
export const DEFAULT_ICON_STYLE: IconStyle = 'outline'
export const ICON_STYLE_KEY = 'icon_style'

// Что меняет стиль относительно «Контура» (stroke-width 1.9, round/round). undefined — не меняет.
export interface IconStyleRule {
  strokeWidth?: number
  linecap?: 'butt' | 'round'
  linejoin?: 'miter' | 'round'
  /** смещённая полупрозрачная копия под штрихом */
  shadow?: boolean
  /** мягкая заливка ТОЛЬКО замкнутых фигур (круг, эллипс, прямоугольник, многоугольник, контур на «z»); открытые линии остаются штрихом */
  duotone?: boolean
}
export const ICON_STYLE_RULES: Record<Exclude<IconStyle, 'outline'>, IconStyleRule> = {
  thin: { strokeWidth: 1.2 },
  bold: { strokeWidth: 2.7 },
  square: { linecap: 'butt', linejoin: 'miter' },
  shadow: { shadow: true },
  duotone: { duotone: true },
}
export const ICON_SHADOW = 'drop-shadow(1.2px 1.2px 0 color-mix(in srgb, currentColor 32%, transparent))'
// Замкнутые фигуры иконки (дуотон заливает только их — заливка открытой галочки или стрелки дала бы «лодочку»)
export const ICON_FILL_TARGETS = ":is(circle, ellipse, rect, polygon, path[d$='z' i])"
export const ICON_DUOTONE_OPACITY = 0.18
export const ICON_SELECTOR = "svg[viewBox='0 0 24 24'][stroke='currentColor']"

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

// Ставит/снимает атрибут на <html> (на открытой странице стиль меняется сразу, без перезагрузки).
export function applyIconStyle(v: IconStyle = readIconStyle()): void {
  if (typeof document === 'undefined') return
  if (v === DEFAULT_ICON_STYLE) document.documentElement.removeAttribute('data-icon-style')
  else document.documentElement.setAttribute('data-icon-style', v)
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

// CSS-блок для style.css (его печатает scripts/apply_themes.py через тест-страж и сверяет с этим текстом).
export function iconStyleCss(): string {
  const lines: string[] = []
  for (const k of Object.keys(ICON_STYLE_RULES) as Exclude<IconStyle, 'outline'>[]) {
    const r = ICON_STYLE_RULES[k]
    const decl: string[] = []
    if (r.strokeWidth !== undefined) decl.push(`stroke-width: ${r.strokeWidth};`)
    if (r.linecap) decl.push(`stroke-linecap: ${r.linecap};`)
    if (r.linejoin) decl.push(`stroke-linejoin: ${r.linejoin};`)
    if (r.shadow) decl.push(`filter: ${ICON_SHADOW};`)
    if (r.duotone) {
      lines.push(`html[data-icon-style='${k}'] ${ICON_SELECTOR} ${ICON_FILL_TARGETS} { fill: currentColor; fill-opacity: ${ICON_DUOTONE_OPACITY}; }`)
      continue
    }
    lines.push(`html[data-icon-style='${k}'] ${ICON_SELECTOR} { ${decl.join(' ')} }`)
  }
  return lines.join('\n')
}
