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
    g += `<path d="${d}L${n1(last[0])} ${n1(baseY)}L${n1(first[0])} ${n1(baseY)}Z" class="ch-area" fill="url(#${uid}-ar)" stroke="none" />`
  }
  g += `<path class="ch-line" pathLength="1" d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
  return g
}

// ── Анимация появления графика (55.2 срез 4) ─────────────────────────────────────────────────────────────────────────
// «none» — по умолчанию (как раньше); «draw» — линия рисуется слева направо, затем проявляются область, точки и подписи.
// Хранится в localStorage `chart_anim`; уважает «уменьшить движение» и «Отключить анимации» (правила в style.css Дашборда).
export const CHART_ANIMS = ['none', 'draw'] as const
export type ChartAnim = (typeof CHART_ANIMS)[number]
export const DEFAULT_CHART_ANIM: ChartAnim = 'none'
export const CHART_ANIM_KEY = 'chart_anim'

export const isChartAnim = (v: unknown): v is ChartAnim => (CHART_ANIMS as readonly unknown[]).includes(v)

export function readChartAnim(): ChartAnim {
  try {
    const stored = localStorage.getItem(CHART_ANIM_KEY)
    if (isChartAnim(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_CHART_ANIM
}

// true, если выбор удалось запомнить.
export function writeChartAnim(v: ChartAnim): boolean {
  try {
    localStorage.setItem(CHART_ANIM_KEY, v)
    return true
  } catch {
    return false
  }
}

// ── Прогноз вперёд (55.2 срез 6) ─────────────────────────────────────────────────────────────────────────────────────
// «off» — по умолчанию (как раньше); «trend» — от последней точки пунктиром на 3 дня вперёд по линейному тренду последних точек.
// Это не предсказание, а продолжение тренда: график подписывает его «прогноз» и рисует приглушённым пунктиром с пустым кружком.
export const CHART_FORECASTS = ['off', 'trend'] as const
export type ChartForecast = (typeof CHART_FORECASTS)[number]
export const DEFAULT_CHART_FORECAST: ChartForecast = 'off'
export const CHART_FORECAST_KEY = 'chart_forecast'
export const FORECAST_DAYS = 3

export const isChartForecast = (v: unknown): v is ChartForecast => (CHART_FORECASTS as readonly unknown[]).includes(v)

export function readChartForecast(): ChartForecast {
  try {
    const stored = localStorage.getItem(CHART_FORECAST_KEY)
    if (isChartForecast(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_CHART_FORECAST
}

// true, если выбор удалось запомнить.
export function writeChartForecast(v: ChartForecast): boolean {
  try {
    localStorage.setItem(CHART_FORECAST_KEY, v)
    return true
  } catch {
    return false
  }
}

// Прогноз на `steps` дней вперёд. pts — [номер дня, значение] только для дней с данными (по возрастанию), lastDay — номер последнего дня графика.
// Наклон — метод наименьших квадратов по последним `window` точкам; значения продолжаются ОТ последней реальной точки (без скачка).
// null — прогнозировать нечего: мало данных (<4 точек) или данные «остыли» (последняя точка старше maxGap дней).
// Если все значения неотрицательны (повторения, граммы), прогноз не опускается ниже нуля.
export function trendForecast(pts: Pt[], lastDay: number, steps: number, maxGap = 2, window = 14): number[] | null {
  const recent = pts.slice(-window)
  if (recent.length < 4) return null
  const [lastX, lastY] = recent[recent.length - 1]
  if (lastDay - lastX > maxGap) return null
  const n = recent.length
  let sx = 0
  let sy = 0
  let sxx = 0
  let sxy = 0
  for (const [x, y] of recent) {
    sx += x
    sy += y
    sxx += x * x
    sxy += x * y
  }
  const den = n * sxx - sx * sx
  const slope = den === 0 ? 0 : (n * sxy - sx * sy) / den
  const nonNegative = recent.every(([, y]) => y >= 0)
  const out: number[] = []
  for (let k = 1; k <= steps; k++) {
    const y = lastY + slope * k
    out.push(Math.round((nonNegative ? Math.max(0, y) : y) * 10) / 10)
  }
  return out
}

// Следующий день после даты «ГГГГ-ММ-ДД» (UTC, без часовых поясов).
export function addDaysIso(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Вид графика: линия или столбцы (55.2 срез 7) ──────────────────────────────────────────────────────────────────────
// «line» — по умолчанию (как раньше); «bars» — столбец на каждый день с данными: с нуля (чтобы высота не врала), скруглённая верхушка,
// у метрик с «особенностями» подходов — составной столбец (сегменты в цветах легенды). Хранится в localStorage `chart_kind`.
// В столбцах стили маркеров/линии/прогноза не применяются (маркеры-диаграммы заменяют сегменты, а линии и прогноза нет).
// Срез 7в: «dots» — только точки без соединяющей линии (маркеры и подписи как у линии; линии, области и прогноза нет — они про «ход»);
// «lollipop» — «леденцы»: тонкий стебель от нуля до значения и кружок-маркер на конце (шкала от нуля, как у столбцов; прогноза нет).
export const CHART_KINDS = ['line', 'bars', 'dots', 'lollipop'] as const
export type ChartKind = (typeof CHART_KINDS)[number]
export const DEFAULT_CHART_KIND: ChartKind = 'line'

// Какие виды рисуют ЛИНИЮ графика (стили линии и прогноз имеют смысл только у «line») и какие растут от нуля (шкала включает 0, чтобы высота не врала).
export const kindDrawsLine = (k: ChartKind): boolean => k === 'line'
export const kindFromZero = (k: ChartKind): boolean => k === 'bars' || k === 'lollipop'
export const CHART_KIND_KEY = 'chart_kind'

export const isChartKind = (v: unknown): v is ChartKind => (CHART_KINDS as readonly unknown[]).includes(v)

export function readChartKind(): ChartKind {
  try {
    const stored = localStorage.getItem(CHART_KIND_KEY)
    if (isChartKind(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_CHART_KIND
}

// true, если выбор удалось запомнить.
export function writeChartKind(v: ChartKind): boolean {
  try {
    localStorage.setItem(CHART_KIND_KEY, v)
    return true
  } catch {
    return false
  }
}

// Контур столбца со скруглёнными ВЕРХНИМИ углами: cx — центр, width — ширина, yTop/yBase — верх и низ (экранные Y, yTop < yBase).
// r не больше половины ширины и высоты, поэтому низкий столбец не «разворачивается».
export function barPath(cx: number, width: number, yTop: number, yBase: number, r = 4): string {
  const x0 = cx - width / 2
  const x1 = cx + width / 2
  const rr = Math.max(0, Math.min(r, width / 2, yBase - yTop))
  return `M${n1(x0)} ${n1(yBase)}V${n1(yTop + rr)}Q${n1(x0)} ${n1(yTop)} ${n1(x0 + rr)} ${n1(yTop)}H${n1(x1 - rr)}Q${n1(x1)} ${n1(yTop)} ${n1(x1)} ${n1(yTop + rr)}V${n1(yBase)}Z`
}

// Сегменты составного столбца снизу вверх: доли повторений → пары [верх, низ] в экранных Y между yTop и yBase.
// Нулевые доли пропускаются; сумма высот равна полной высоте столбца.
export function stackSpans(reps: number[], yTop: number, yBase: number): ([number, number] | null)[] {
  const total = reps.reduce((a, v) => a + (v > 0 ? v : 0), 0)
  if (total <= 0) return reps.map(() => null)
  const height = yBase - yTop
  let bottom = yBase
  return reps.map((v) => {
    if (!(v > 0)) return null
    const top = bottom - (v / total) * height
    const span: [number, number] = [top, bottom]
    bottom = top
    return span
  })
}

// <defs> с вертикальным градиентом столбца (цвет → чуть светлее к низу) для одноцветных столбцов.
export function barDefs(uid: string, color: string): string {
  return `<defs><linearGradient id="${uid}-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="1"/><stop offset="1" stop-color="${color}" stop-opacity=".62"/></linearGradient></defs>`
}

// ── Зона цели (55.2 срез 8) ──────────────────────────────────────────────────────────────────────────────────────────
// «off» — по умолчанию (как раньше, только пунктир цели); «on» — мягкая полоса по ту сторону цели, где «хорошо» (по направлению цели метрики:
// «не меньше X» — выше цели, «меньше X» — ниже). У параметров тела направления нет — зоны нет. Хранится в localStorage `chart_goalzone`.
export const CHART_GOALZONES = ['off', 'on'] as const
export type ChartGoalZone = (typeof CHART_GOALZONES)[number]
export const DEFAULT_CHART_GOALZONE: ChartGoalZone = 'off'
export const CHART_GOALZONE_KEY = 'chart_goalzone'

export const isChartGoalZone = (v: unknown): v is ChartGoalZone => (CHART_GOALZONES as readonly unknown[]).includes(v)

export function readChartGoalZone(): ChartGoalZone {
  try {
    const stored = localStorage.getItem(CHART_GOALZONE_KEY)
    if (isChartGoalZone(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_CHART_GOALZONE
}

// true, если выбор удалось запомнить.
export function writeChartGoalZone(v: ChartGoalZone): boolean {
  try {
    localStorage.setItem(CHART_GOALZONE_KEY, v)
    return true
  } catch {
    return false
  }
}

// Прямоугольник зоны цели [верх, низ] в экранных Y внутри поля графика [plotTop, plotBottom]; null — зоны нет (нет направления или цели).
// at_least: от верха поля до цели; at_most: от цели до низа поля. Цель за пределами поля обрезается; пустая зона — null.
export function goalZoneSpan(goalY: number, direction: string | null | undefined, plotTop: number, plotBottom: number): [number, number] | null {
  if (direction !== 'at_least' && direction !== 'at_most') return null
  const g = Math.min(plotBottom, Math.max(plotTop, goalY))
  const span: [number, number] = direction === 'at_least' ? [plotTop, g] : [g, plotBottom]
  return span[1] - span[0] > 0.5 ? span : null
}

// Мини-спарклайны (55.2 последний срез): крошечный график за 7 дней под значением в плашках числовых метрик «Дневных метрик». «Дополнение», по умолчанию выключено.
export const CHART_SPARKS = ['off', 'on'] as const
export type ChartSparks = (typeof CHART_SPARKS)[number]
export const DEFAULT_CHART_SPARKS: ChartSparks = 'off'
export const CHART_SPARKS_KEY = 'chart_sparks'

export const isChartSparks = (v: unknown): v is ChartSparks => (CHART_SPARKS as readonly unknown[]).includes(v)

export function readChartSparks(): ChartSparks {
  try {
    const stored = localStorage.getItem(CHART_SPARKS_KEY)
    if (isChartSparks(stored)) return stored
  } catch {
    /* нет localStorage — по умолчанию */
  }
  return DEFAULT_CHART_SPARKS
}

// true, если выбор удалось запомнить.
export function writeChartSparks(v: ChartSparks): boolean {
  try {
    localStorage.setItem(CHART_SPARKS_KEY, v)
    return true
  } catch {
    return false
  }
}
