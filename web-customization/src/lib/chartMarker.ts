// Стили маркеров-мини-диаграмм на графиках (BACKLOG 13:54 «кружки в духе liquid glass»; владелец 2026-10-10: «мне все варианты
// нравятся, давай добавим в раздел кастомизации»): плоский (прежний, по умолчанию) · стекло · капля · контур · наклейка · неон. Выбор — localStorage
// `chart_marker`, меняется в «Кастомизации». ЭТОТ ФАЙЛ копируется в web-customization/src/lib/ БЕЗ изменений
// (scripts/apply_chart_marker.py; тест сверяет) — правь здесь. Чистые строки SVG, без фильтров и backdrop-filter:
// «стекло» и «капля» — градиенты и обводка. Градиенты — в <defs> с уникальным id на график (markerDefs).
// Срез 7е: «кольцо» (ring) — диаграмма-бублик с отверстием в центре; «мишень» (target) — тонкое внешнее кольцо и уменьшенная диаграмма внутри.
// Оба — только круги/пути/группа с transform: без фильтров и градиентов (defs не нужны).
export const CHART_MARKERS = ['flat', 'glass', 'drop', 'outline', 'sticker', 'neon', 'ring', 'target'] as const
export type ChartMarker = (typeof CHART_MARKERS)[number]
export const DEFAULT_CHART_MARKER: ChartMarker = 'flat'
export const CHART_MARKER_KEY = 'chart_marker'

export interface MarkerSlice {
  color: string
  full: boolean // единственный цвет — целый круг (path пустой)
  path: string
}

export const isChartMarker = (v: unknown): v is ChartMarker => (CHART_MARKERS as readonly unknown[]).includes(v)

export function readChartMarker(): ChartMarker {
  try {
    const stored = localStorage.getItem(CHART_MARKER_KEY)
    if (isChartMarker(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_CHART_MARKER
}

// true, если выбор удалось запомнить.
export function writeChartMarker(v: ChartMarker): boolean {
  try {
    localStorage.setItem(CHART_MARKER_KEY, v)
    return true
  } catch {
    return false
  }
}

let uidCounter = 0
export const nextMarkerUid = (): string => 'cm' + ++uidCounter

// <defs> с градиентами для стилей «стекло»/«капля»; для остальных — пустая строка. uid — уникальный на график.
export function markerDefs(style: ChartMarker, uid: string): string {
  if (style === 'glass')
    return `<defs><radialGradient id="${uid}-gl" cx="30%" cy="25%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`
  if (style === 'drop')
    return `<defs><linearGradient id="${uid}-dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient></defs>`
  return ''
}

const f1 = (n: number): string => n.toFixed(1)

// Внутренность маркера (без <g>/<title>): сектора + оформление выбранного стиля. r — радиус (6.5 на графиках).
export function markerParts(style: ChartMarker, slices: MarkerSlice[], x: number, y: number, r: number, uid: string): string {
  if (!slices.length) return ''
  const cx = f1(x)
  const cy = f1(y)
  let g = ''
  if (style === 'glass') {
    g += `<circle cx="${cx}" cy="${cy}" r="${r + 1.6}" fill="${slices[0].color}" opacity=".16"/>`
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" fill-opacity=".72"/>`
        : `<path d="${s.path}" fill="${s.color}" fill-opacity=".72" stroke="#fff" stroke-opacity=".7" stroke-width=".55" stroke-linejoin="round"/>`
    g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid}-gl)"/><circle cx="${cx}" cy="${cy}" r="${r - 0.3}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>`
  } else if (style === 'drop') {
    g += `<ellipse cx="${cx}" cy="${f1(y + r * 0.95)}" rx="${f1(r * 0.85)}" ry="1.6" fill="#000" opacity=".35"/>`
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}"/>`
        : `<path d="${s.path}" fill="${s.color}" stroke="var(--bg-card)" stroke-opacity=".7" stroke-width=".7"/>`
    g += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${uid}-dr)"/><ellipse cx="${f1(x - 2.1)}" cy="${f1(y - 2.6)}" rx="2.3" ry="1.3" fill="#fff" opacity=".55" transform="rotate(-35 ${f1(x - 2.1)} ${f1(y - 2.6)})"/>`
  } else if (style === 'sticker') {
    // «Наклейка» (правило владельца: новые предметы в малые разделы): белая вырезная кайма, лёгкая тень под ней, сектора плотные
    g += `<ellipse cx="${cx}" cy="${f1(y + r * 0.9)}" rx="${f1(r + 1.4)}" ry="${f1(r * 0.55)}" fill="#000" opacity=".18"/>`
    g += `<circle cx="${cx}" cy="${cy}" r="${r + 1.9}" fill="var(--bg-card)" stroke="var(--border)" stroke-width=".6"/>`
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}"/>`
        : `<path d="${s.path}" fill="${s.color}" stroke="var(--bg-card)" stroke-width=".9" stroke-linejoin="round"/>`
    g += `<ellipse cx="${f1(x - 2.2)}" cy="${f1(y - 2.7)}" rx="2" ry="1.1" fill="#fff" opacity=".5" transform="rotate(-35 ${f1(x - 2.2)} ${f1(y - 2.7)})"/>`
  } else if (style === 'neon') {
    // «Неон»: два мягких ореола цветом сектора, тонкое светящееся кольцо и яркое ядро; сектора полупрозрачные
    g += `<circle cx="${cx}" cy="${cy}" r="${r + 3.2}" fill="${slices[0].color}" opacity=".1"/><circle cx="${cx}" cy="${cy}" r="${r + 1.6}" fill="${slices[0].color}" opacity=".18"/>`
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r - 0.6}" fill="${s.color}" fill-opacity=".22" stroke="${s.color}" stroke-width="1.2"/>`
        : `<path d="${s.path}" fill="${s.color}" fill-opacity=".22" stroke="${s.color}" stroke-width="1.2" stroke-linejoin="round"/>`
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(r - 2.6)}" fill="none" stroke="${slices[0].color}" stroke-opacity=".7" stroke-width=".6"/><circle cx="${cx}" cy="${cy}" r="1.5" fill="${slices[0].color}"/>`
  } else if (style === 'outline') {
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r - 0.6}" fill="${s.color}" fill-opacity=".3" stroke="${s.color}" stroke-width="1.3"/>`
        : `<path d="${s.path}" fill="${s.color}" fill-opacity=".3" stroke="${s.color}" stroke-width="1.3" stroke-linejoin="round"/>`
    g += `<circle cx="${cx}" cy="${cy}" r="1.1" fill="var(--bg-card)"/>`
  } else if (style === 'ring') {
    // бублик: те же сектора, в центре отверстие цвета карточки (радиус — доля от r, чтобы читались и тонкие сектора)
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" stroke="var(--bg-card)" stroke-width="1" />`
        : `<path d="${s.path}" fill="${s.color}" stroke="var(--bg-card)" stroke-width=".8" stroke-linejoin="round" />`
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(r * 0.46)}" fill="var(--bg-card)" />`
  } else if (style === 'target') {
    // мишень: внешнее тонкое кольцо цвета первого сектора и уменьшенная (×0.62) диаграмма внутри; масштаб вокруг центра маркера
    g += `<circle cx="${cx}" cy="${cy}" r="${f1(r)}" fill="none" stroke="${slices[0].color}" stroke-width="1.2" stroke-opacity=".75" />`
    g += `<g transform="translate(${cx} ${cy}) scale(.62) translate(-${cx} -${cy})">`
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" stroke="var(--bg-card)" stroke-width="1.5" />`
        : `<path d="${s.path}" fill="${s.color}" stroke="var(--bg-card)" stroke-width="1.2" stroke-linejoin="round" />`
    g += '</g>'
  } else {
    // flat — РОВНО прежний вид (не менять: на нём держатся тесты и привычка)
    for (const s of slices)
      g += s.full
        ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.color}" stroke="var(--bg-card)" stroke-width="1.5" />`
        : `<path d="${s.path}" fill="${s.color}" stroke="var(--bg-card)" stroke-width="1" />`
  }
  return g
}

// Для предпросмотра в «Кастомизации»: сектора из долей (повторений) на образцовой палитре, начало сверху, по часовой.
export const PREVIEW_PALETTE = ['#5b8def', '#f2a93c', '#4cc38a', '#ff4f81']
export function previewSlices(reps: number[], cx: number, cy: number, r: number): MarkerSlice[] {
  const live = reps.map((n, i) => ({ n, color: PREVIEW_PALETTE[i % PREVIEW_PALETTE.length] })).filter((s) => s.n > 0)
  const total = live.reduce((a, s) => a + s.n, 0)
  if (total <= 0) return []
  if (live.length === 1) return [{ color: live[0].color, full: true, path: '' }]
  const out: MarkerSlice[] = []
  let a = -Math.PI / 2
  for (const s of live) {
    const da = (s.n / total) * Math.PI * 2
    const b = a + da
    const p = (v: number): string => (Math.round(v * 10) / 10).toString()
    out.push({
      color: s.color,
      full: false,
      path: `M${p(cx)} ${p(cy)} L${p(cx + r * Math.cos(a))} ${p(cy + r * Math.sin(a))} A${p(r)} ${p(r)} 0 ${da > Math.PI ? 1 : 0} 1 ${p(cx + r * Math.cos(b))} ${p(cy + r * Math.sin(b))} Z`,
    })
    a = b
  }
  return out
}
