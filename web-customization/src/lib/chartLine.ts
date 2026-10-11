// Стили ЛИНИИ графика (BACKLOG 55.2 срез 3, обзор «градиентная область + сглаживание»): обычная (прежняя, по умолчанию) ·
// сглаженная · сглаженная с градиентной областью под линией. Выбор — localStorage `chart_line`, меняется в «Кастомизации».
// ЭТОТ ФАЙЛ копируется в web-customization/src/lib/ БЕЗ изменений (scripts/apply_chart_marker.py; тест сверяет) — правь здесь.
// Сглаживание — монотонная кубическая интерполяция (Fritsch–Carlson): кривая НЕ вылетает выше/ниже реальных значений,
// поэтому «пика, которого не было» на графике не бывает (важно для честности цифр).
export const CHART_LINES = ['line', 'smooth', 'area'] as const
export type ChartLine = (typeof CHART_LINES)[number]
export const DEFAULT_CHART_LINE: ChartLine = 'line'
export const CHART_LINE_KEY = 'chart_line'

export type Pt = [number, number]

export const isChartLine = (v: unknown): v is ChartLine => (CHART_LINES as readonly unknown[]).includes(v)

export function readChartLine(): ChartLine {
  try {
    const stored = localStorage.getItem(CHART_LINE_KEY)
    if (isChartLine(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_CHART_LINE
}

// true, если выбор удалось запомнить.
export function writeChartLine(v: ChartLine): boolean {
  try {
    localStorage.setItem(CHART_LINE_KEY, v)
    return true
  } catch {
    return false
  }
}

const n1 = (v: number): string => (Math.round(v * 10) / 10).toString()

// Путь «M x y C …» через точки с монотонными касательными (по оси Y — экранной: меньше = выше, монотонность сохраняется).
export function monotonePath(pts: Pt[]): string {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M${n1(pts[0][0])} ${n1(pts[0][1])}`
  const dx: number[] = []
  const m: number[] = [] // наклоны отрезков
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    m.push(dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i])
  }
  const t: number[] = new Array(n).fill(0)
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i] / m[i]
    const b = t[i + 1] / m[i]
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      t[i] = k * a * m[i]
      t[i + 1] = k * b * m[i]
    }
  }
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += `C${n1(pts[i][0] + h)} ${n1(pts[i][1] + t[i] * h)} ${n1(pts[i + 1][0] - h)} ${n1(pts[i + 1][1] - t[i + 1] * h)} ${n1(pts[i + 1][0])} ${n1(pts[i + 1][1])}`
  }
  return d
}

// <defs> с вертикальным градиентом области (цвет → прозрачность) для стиля «area»; для остальных — пустая строка.
export function lineDefs(style: ChartLine, uid: string, color: string): string {
  if (style !== 'area') return ''
  return `<defs><linearGradient id="${uid}-ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".38"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`
}

// Участок графика без пропусков (>=2 точек подряд) в выбранном стиле. baseY — нижняя граница области (ось X).
// Для стиля «line» не используется: прежняя отрисовка отрезками остаётся в ChartBlock как была.
export function runParts(style: ChartLine, run: Pt[], color: string, baseY: number, uid: string): string {
  if (run.length < 2 || style === 'line') return ''
  const d = monotonePath(run)
  let g = ''
  if (style === 'area') {
    const last = run[run.length - 1]
    const first = run[0]
    g += `<path d="${d}L${n1(last[0])} ${n1(baseY)}L${n1(first[0])} ${n1(baseY)}Z" fill="url(#${uid}-ar)" stroke="none" />`
  }
  g += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
  return g
}
