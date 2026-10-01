import type { VariationShare } from './variationChart'

export interface ChartPoint {
  date: string // ISO
  y: number | null
  bucketDays?: number
  // доли по особенностям подхода (метрики-подходы, BACKLOG 19 11:41): из какого дня взято значение точки
  shares?: VariationShare[]
}

// Заполняет пропущенные дни null-точками (чтобы график рисовал пунктир на дырах, а не
// схлопывал соседние даты), затем, если точек больше maxPoints, укрупняет в корзины —
// последнее известное значение в каждой корзине. Портировано 1:1 из prepareChartSeries()
// в config.js.
export function prepareChartSeries(rawPoints: { date: string; y: number | null; shares?: VariationShare[] }[], maxPoints = 24): ChartPoint[] {
  if (!rawPoints || rawPoints.length === 0) return []
  const sorted = [...rawPoints].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 1) return sorted

  const dayMs = 86400000
  const first = new Date(sorted[0].date + 'T00:00:00')
  const last = new Date(sorted[sorted.length - 1].date + 'T00:00:00')
  const totalDays = Math.round((last.getTime() - first.getTime()) / dayMs) + 1

  const byDate: Record<string, number | null> = {}
  const sharesByDate: Record<string, VariationShare[] | undefined> = {}
  sorted.forEach((p) => {
    byDate[p.date] = p.y
    if (p.shares) sharesByDate[p.date] = p.shares
  })

  const full: ChartPoint[] = []
  for (let i = 0; i < totalDays; i++) {
    // календарный шаг (setDate), а не first + i×24ч: в сутки перехода времени это давало дубль и пропуск даты
    const d = new Date(first)
    d.setDate(first.getDate() + i)
    const key = fmtDateLocal(d)
    full.push(key in sharesByDate ? { date: key, y: key in byDate ? byDate[key] : null, shares: sharesByDate[key] } : { date: key, y: key in byDate ? byDate[key] : null })
  }

  if (full.length <= maxPoints) return full

  const bucketSize = Math.ceil(full.length / maxPoints)
  const bucketed: ChartPoint[] = []
  for (let i = 0; i < full.length; i += bucketSize) {
    const chunk = full.slice(i, i + bucketSize)
    const withValue = chunk.filter((p) => p.y != null)
    const lastReal = withValue.length ? withValue[withValue.length - 1] : null
    const y = lastReal ? lastReal.y : null
    // значение корзины — последнее известное, поэтому и доли берём из того же дня
    const bucket: ChartPoint = { date: chunk[chunk.length - 1].date, y, bucketDays: chunk.length }
    if (lastReal?.shares) bucket.shares = lastReal.shares
    bucketed.push(bucket)
  }
  return bucketed
}

function fmtDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type PeriodRange = 'days10' | 'days30' | 'week' | 'last_week' | 'month' | 'all' | 'custom'

export interface PeriodState {
  range: PeriodRange
  from: string | null
  to: string | null
}

// Портировано 1:1 из periodBounds() в config.js. today передаётся явно для тестируемости
// (оригинал всегда брал new Date()).
export function periodBounds(rangeKey: PeriodRange, customFrom: string | null, customTo: string | null, today: Date = new Date()): [string | null, string | null] {
  const dow = (today.getDay() + 6) % 7 // 0 = понедельник
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - dow)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  if (rangeKey === 'days10') {
    const start = new Date(today)
    start.setDate(today.getDate() - 9)
    return [fmtDateLocal(start), fmtDateLocal(today)]
  }
  if (rangeKey === 'days30') {
    const start = new Date(today)
    start.setDate(today.getDate() - 29)
    return [fmtDateLocal(start), fmtDateLocal(today)]
  }
  if (rangeKey === 'week') return [fmtDateLocal(startOfWeek), fmtDateLocal(today)]
  if (rangeKey === 'last_week') {
    const startLastWeek = new Date(startOfWeek)
    startLastWeek.setDate(startOfWeek.getDate() - 7)
    const endLastWeek = new Date(startOfWeek)
    endLastWeek.setDate(startOfWeek.getDate() - 1)
    return [fmtDateLocal(startLastWeek), fmtDateLocal(endLastWeek)]
  }
  if (rangeKey === 'month') return [fmtDateLocal(startOfMonth), fmtDateLocal(today)]
  if (rangeKey === 'custom') return [customFrom || null, customTo || null]
  return [null, null] // "all" — без ограничения
}

// Портировано из filterPointsByRange() в dashboard.js.
export function filterPointsByRange<P extends { date: string; y: number | null }>(points: P[], rangeKey: PeriodRange, customFrom: string | null, customTo: string | null, today: Date = new Date()) {
  const [from, to] = periodBounds(rangeKey, customFrom, customTo, today)
  if (!from) return points
  return points.filter((p) => p.date >= from && (!to || p.date <= to))
}

// BACKLOG 18.2: короткий период («последние 10 дней», «эта неделя» в понедельник) мог оставить в окне 0–1 значение, и график
// писал «мало данных», хотя за более широкий срок записи есть. Если в выбранном периоде меньше двух значений, а в серии
// (до конца периода) их есть минимум два — показываем окно от предпоследней записи и помечаем это (widened), чтобы
// интерфейс честно сказал, что период расширен. Для «Всё» и когда данных нет вообще ничего не меняется.
export function filterPointsWithFallback<P extends { date: string; y: number | null }>(
  points: P[],
  rangeKey: PeriodRange,
  customFrom: string | null,
  customTo: string | null,
  today: Date = new Date(),
): { points: P[]; widened: boolean } {
  const base = filterPointsByRange(points, rangeKey, customFrom, customTo, today)
  const realCount = (arr: { y: number | null }[]) => arr.reduce((n, p) => n + (p.y != null ? 1 : 0), 0)
  if (rangeKey === 'all' || realCount(base) >= 2) return { points: base, widened: false }
  const [, to] = periodBounds(rangeKey, customFrom, customTo, today)
  const upto = points.filter((p) => p.y != null && (!to || p.date <= to))
  if (upto.length < 2) return { points: base, widened: false }
  const start = upto[upto.length - 2].date
  return { points: points.filter((p) => p.date >= start && (!to || p.date <= to)), widened: true }
}

// Период графика запоминается в localStorage между сессиями — портировано из
// loadPeriodState()/savePeriodState() в config.js.
export function loadPeriodState(storageKey: string, fallback: PeriodState): PeriodState {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.range) return parsed
    }
  } catch {
    /* повреждённые данные в localStorage — просто используем дефолт */
  }
  return fallback
}

export function savePeriodState(storageKey: string, state: PeriodState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ range: state.range, from: state.from, to: state.to }))
  } catch {
    /* localStorage недоступен — не критично */
  }
}
