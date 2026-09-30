import { metricNumericValue } from './metrics'
import { pointsPerDaySeries } from './points-series'
import { unitSuffix, type BodyParam, type BodyValue } from './profile'
import type { Metric, DailyValueRow } from './types'

// Чистая логика выбора и построения серий для графиков Дашборда — портировано из
// buildAvailableSeries()/loadCharts()/renderEditableSeriesValues()/openChartsConfigModal()
// в dashboard.js. Без сети и без Vue.

export interface SeriesPoint {
  date: string
  y: number | null
}

export interface ChartSeries {
  label: string // текстовая подпись (списки, <option>): эмодзи как есть, svg-иконка в текст не попадает
  name?: string // «чистое» название без иконки — для заголовка графика, где иконку рисует <MetricIcon>
  icon?: string | null // иконка метрики/параметра тела как хранится ("svg:<имя>" или эмодзи)
  unit: string
  color: string
  points: SeriesPoint[]
  defaultGoal?: number | null
  type?: string // тип метрики (для 'sets' значения из графика не правятся)
}

export interface ChartEntry {
  key: string
  goal: number | null
}

// Как в iconLabelText(): эмодзи-иконка идёт текстом перед названием, svg-иконка в подпись не попадает.
export function iconLabelText(icon: string | null | undefined, name: string): string {
  const prefix = !icon || icon.startsWith('svg:') ? '' : icon
  return `${prefix} ${name}`.trim()
}

// Порядок ключей важен: сначала параметры тела, затем «баллы», затем метрики (как в оригинале —
// от него зависит порядок в списке «добавить график»).
export function buildSeries(bodyParams: BodyParam[], bodyValues: BodyValue[], metrics: Metric[], dailyValues: DailyValueRow[], pointsLabel = ''): Record<string, ChartSeries> {
  const series: Record<string, ChartSeries> = {}

  for (const p of bodyParams) {
    series[`body:${p.id}`] = {
      label: iconLabelText(p.icon, p.name),
      name: p.name,
      icon: p.icon,
      unit: unitSuffix(p.unit),
      color: 'var(--accent)',
      points: bodyValues.filter((v) => v.parameter_id === p.id && v.value != null).map((v) => ({ date: v.date, y: v.value })),
    }
  }

  series['points'] = { label: pointsLabel, unit: '', color: 'var(--danger)', points: pointsPerDaySeries(metrics, dailyValues) }

  const byDay: Record<string, Record<string, DailyValueRow['value']>> = {}
  for (const v of dailyValues) (byDay[v.date] ||= {})[v.metric_id] = v.value
  const days = Object.keys(byDay).sort()

  for (const m of metrics.filter((x) => x.type === 'number' || x.type === 'sets')) {
    series[`metric:${m.id}`] = {
      label: iconLabelText(m.icon, m.name),
      name: m.name,
      icon: m.icon,
      unit: m.unit ? ' ' + m.unit : '',
      color: 'var(--accent)',
      type: m.type,
      points: days
        .filter((d) => byDay[d][m.id] !== undefined)
        .map((d) => ({ date: d, y: metricNumericValue(m, byDay[d][m.id]) }))
        .filter((p) => p.y != null), // «подходы» с пустым/битым значением — пропускаем точку, а не рисуем дыру нулём
      // цель из самой метрики — линия-ориентир по умолчанию
      defaultGoal: m.goal_value ? m.goal_value : null,
    }
  }
  return series
}

// dashboard_charts исторически — массив строк-ключей; теперь может быть массивом {key, goal}.
// Понимаем оба формата. null — ничего не сохранено (нужны значения по умолчанию).
export function parseSavedEntries(saved: unknown): ChartEntry[] | null {
  if (!Array.isArray(saved) || saved.length === 0) return null
  const out: ChartEntry[] = []
  for (const e of saved) {
    if (typeof e === 'string') out.push({ key: e, goal: null })
    else if (e && typeof e === 'object' && typeof (e as ChartEntry).key === 'string') out.push({ key: (e as ChartEntry).key, goal: (e as ChartEntry).goal ?? null })
  }
  return out
}

// Выбор по умолчанию: первые два параметра тела + «баллы»; затем отбрасываем ключи, которых
// больше нет (удалённая метрика/параметр).
export function resolveEntries(saved: unknown, series: Record<string, ChartSeries>): ChartEntry[] {
  let entries = parseSavedEntries(saved)
  if (!entries) {
    const bodyKeys = Object.keys(series).filter((k) => k.startsWith('body:')).slice(0, 2)
    entries = [...bodyKeys, 'points'].map((k) => ({ key: k, goal: null }))
  }
  return entries.filter((e) => series[e.key])
}

// Цель-ориентир: своя у графика, иначе из метрики; подпись «Ориентир: N ед.».
export function entryGoal(entry: ChartEntry, s: ChartSeries): number | null {
  return entry.goal != null ? entry.goal : (s.defaultGoal ?? null)
}

export function parseKey(key: string): { prefix: string; id: string } {
  const i = key.indexOf(':')
  return i < 0 ? { prefix: key, id: '' } : { prefix: key.slice(0, i), id: key.slice(i + 1) }
}

// Правка значений прямо из графика: только для метрик-чисел и параметров тела.
// «Баллы» — вычисляемое поле; «подходы» правятся через карточку дня (иначе одно число
// затёрло бы весь список подходов за день).
export function canEditValues(key: string, type?: string): boolean {
  const { prefix } = parseKey(key)
  if (prefix !== 'metric' && prefix !== 'body') return false
  return type !== 'sets'
}

export function moveEntry(order: ChartEntry[], index: number, dir: -1 | 1): ChartEntry[] {
  const j = index + dir
  if (index < 0 || index >= order.length || j < 0 || j >= order.length) return order
  const next = [...order]
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

export function removeEntry(order: ChartEntry[], key: string): ChartEntry[] {
  return order.filter((e) => e.key !== key)
}

// Ключи, которые ещё можно добавить (в порядке серий).
export function addableKeys(series: Record<string, ChartSeries>, order: ChartEntry[]): string[] {
  return Object.keys(series).filter((k) => !order.some((e) => e.key === k))
}

// Порт pushPointToChart(): заменить значение точки за дату или вставить новую с сохранением порядка.
export function upsertPoint(points: SeriesPoint[], date: string, y: number | null): SeriesPoint[] {
  const idx = points.findIndex((p) => p.date === date)
  if (idx >= 0) return points.map((p, i) => (i === idx ? { ...p, y } : p))
  return [...points, { date, y }].sort((a, b) => a.date.localeCompare(b.date))
}

// Значение из поля ввода правки: пусто → null; нечисло → 0 (как parseFloat(x) || 0 в оригинале).
export function parseEditedValue(raw: string): number | null {
  if (raw === '') return null
  return parseFloat(raw) || 0
}
