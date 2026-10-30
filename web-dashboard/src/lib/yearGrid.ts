import { addDaysIso, fmtDate } from './date'
import { isMetricDone, metricExpectedOn, metricNumericValue, metricSchedule } from './metrics'
import type { Metric } from './types'

// Год-сетка (BACKLOG 75.8): квадраты по дням за последние ~год — выполнено / пропущено / выходной. Режим — «идеальные дни» (как серия «идеальный день»:
// выполнены все метрики, нужные в этот день по расписанию) или одна метрика. Честность по правилу 73.5: дни ДО первой записи не штрафуются
// (там пользователь привычку ещё не вёл — это «нет данных», а не «пропуск»), сегодняшний невыполненный день — «ещё идёт», а не пропуск,
// выходной (по расписанию не нужно) — отдельное состояние. Считаем теми же isMetricDone/metricExpectedOn, что серии и сила привычки.
export type CellState = 'done' | 'missed' | 'rest' | 'pending' | 'none' | 'future'
export interface GridCell {
  date: string
  state: CellState
  value: number | null // число у числовой метрики (в режиме метрики)
  done: number // в режиме «идеальные дни»: сколько метрик выполнено…
  total: number // …из скольких нужных в этот день
}
export interface YearGridResult {
  weeks: GridCell[][] // столбцы-недели (пн…вс); в первой/последней неделе клетки вне окна — 'future'/'none'
  doneDays: number
  countedDays: number // выполнено + пропущено (выходные, «нет данных» и сегодняшний невыполненный день не считаются)
  first: string | null // первый день с данными
}
export interface YearGridData {
  metrics: Metric[]
  byDay: Record<string, Record<string, unknown>>
  notes: Record<string, string[]> // «что полезного сделал за день» по датам (daily_notes.items)
  today: Date
}
export const PERFECT_MODE = 'perfect'
export const GRID_DAYS = 364

type ByDay = Readonly<Record<string, Record<string, unknown>>>

// Метрики, которые имеет смысл показывать по дням: «N раз в неделю» и «не больше N» дня не имеют (у них нет «пропущенного дня»).
export function gridMetrics(metrics: readonly Metric[]): Metric[] {
  return (metrics || []).filter((m) => {
    const s = metricSchedule(m)
    if (s?.type === 'weekly' || s?.type === 'at_most') return false
    return !((m.type === 'number' || m.type === 'sets') && m.goal_direction === 'at_most')
  })
}

const mondayOffset = (iso: string) => (new Date(iso + 'T12:00:00').getDay() + 6) % 7

export function buildYearGrid(metrics: readonly Metric[], byDay: ByDay, mode: string, today: Date, days = GRID_DAYS): YearGridResult {
  const todayStr = fmtDate(today)
  const startWindow = addDaysIso(todayStr, -(days - 1))
  const gridStart = addDaysIso(startWindow, -mondayOffset(startWindow))
  const metric = mode === PERFECT_MODE ? null : (metrics.find((m) => m.id === mode) ?? null)
  const perfect = mode === PERFECT_MODE || metric === null
  const eligible = (metrics || []).filter((m) => m.count_streak !== false) // как в серии «идеальный день»

  let first: string | null = null
  for (const d of Object.keys(byDay)) {
    const has = perfect ? Object.keys(byDay[d] || {}).length > 0 : byDay[d]?.[metric!.id] !== undefined
    if (has && (first === null || d < first)) first = d
  }

  const weeks: GridCell[][] = []
  let doneDays = 0
  let countedDays = 0
  for (let d = gridStart; ; d = addDaysIso(d, 1)) {
    if (weeks.length === 0 || weeks[weeks.length - 1].length === 7) {
      if (d > todayStr) break // последняя неделя дописана, новая нужна только если в ней есть день не позже сегодня
      weeks.push([])
    }
    const col = weeks[weeks.length - 1]
    const cell: GridCell = { date: d, state: 'none', value: null, done: 0, total: 0 }
    if (d > todayStr) cell.state = 'future'
    else if (d < startWindow) cell.state = 'none'
    else if (first === null || d < first) cell.state = 'none'
    else if (perfect) {
      const exp = eligible.filter((m) => metricExpectedOn(m, d))
      const doneCnt = exp.filter((m) => isMetricDone(m, byDay[d]?.[m.id] as never, d)).length
      cell.total = exp.length
      cell.done = doneCnt
      cell.state = exp.length === 0 ? 'rest' : doneCnt === exp.length ? 'done' : d === todayStr ? 'pending' : 'missed'
    } else {
      const m = metric!
      const raw = byDay[d]?.[m.id]
      cell.value = metricNumericValue(m, raw as never)
      const done = isMetricDone(m, raw as never, d)
      cell.state = done ? 'done' : !metricExpectedOn(m, d) ? 'rest' : d === todayStr ? 'pending' : 'missed'
    }
    if (cell.state === 'done') {
      doneDays++
      countedDays++
    } else if (cell.state === 'missed') countedDays++
    col.push(cell)
  }
  return { weeks, doneDays, countedDays, first }
}
