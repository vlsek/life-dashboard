export interface ChartPoint {
  date: string // ISO
  y: number | null
  bucketDays?: number
}

// Заполняет пропущенные дни null-точками (чтобы график рисовал пунктир на дырах, а не
// схлопывал соседние даты), затем, если точек больше maxPoints, укрупняет в корзины —
// последнее известное значение в каждой корзине. Портировано 1:1 из prepareChartSeries()
// в config.js.
export function prepareChartSeries(rawPoints: { date: string; y: number | null }[], maxPoints = 24): ChartPoint[] {
  if (!rawPoints || rawPoints.length === 0) return []
  const sorted = [...rawPoints].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 1) return sorted

  const dayMs = 86400000
  const first = new Date(sorted[0].date + 'T00:00:00')
  const last = new Date(sorted[sorted.length - 1].date + 'T00:00:00')
  const totalDays = Math.round((last.getTime() - first.getTime()) / dayMs) + 1

  const byDate: Record<string, number | null> = {}
  sorted.forEach((p) => (byDate[p.date] = p.y))

  const full: ChartPoint[] = []
  for (let i = 0; i < totalDays; i++) {
    // календарный шаг (setDate), а не first + i×24ч: в сутки перехода времени это давало дубль и пропуск даты
    const d = new Date(first)
    d.setDate(first.getDate() + i)
    const key = fmtDateLocal(d)
    full.push({ date: key, y: key in byDate ? byDate[key] : null })
  }

  if (full.length <= maxPoints) return full

  const bucketSize = Math.ceil(full.length / maxPoints)
  const bucketed: ChartPoint[] = []
  for (let i = 0; i < full.length; i += bucketSize) {
    const chunk = full.slice(i, i + bucketSize)
    const withValue = chunk.filter((p) => p.y != null)
    const y = withValue.length ? withValue[withValue.length - 1].y : null
    bucketed.push({ date: chunk[chunk.length - 1].date, y, bucketDays: chunk.length })
  }
  return bucketed
}

function fmtDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// days7/days90/year — новые короткие пресеты (BACKLOG 16, 13:44); days10/week/last_week/month остаются, чтобы сохранённые у людей периоды работали
export type PeriodRange = 'days7' | 'days10' | 'days30' | 'days90' | 'year' | 'week' | 'last_week' | 'month' | 'all' | 'custom'

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

  if (rangeKey === 'days7' || rangeKey === 'days90' || rangeKey === 'year') {
    const span = rangeKey === 'days7' ? 6 : rangeKey === 'days90' ? 89 : 364 // скользящее окно, включая сегодня
    const start = new Date(today)
    start.setDate(today.getDate() - span)
    return [fmtDateLocal(start), fmtDateLocal(today)]
  }
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
export function filterPointsByRange(points: { date: string; y: number | null }[], rangeKey: PeriodRange, customFrom: string | null, customTo: string | null, today: Date = new Date()) {
  const [from, to] = periodBounds(rangeKey, customFrom, customTo, today)
  if (!from) return points
  return points.filter((p) => p.date >= from && (!to || p.date <= to))
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
