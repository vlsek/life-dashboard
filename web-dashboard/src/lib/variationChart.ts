import { normalizeSets } from './setsBlock'

// Графики метрик-подходов: точка дня — «мини-круг» из долей по особенностям подхода (BACKLOG 19, 11:41).
// Пример владельца: за день 100 отжиманий — 50 классических, 30 алмазных, 20 на бицепс → точка делится на три сектора
// 50/30/20 %, если все классические — точка одного цвета. Под графиком — легенда «цвет → особенность».
// Только чистая логика (без DOM, сети, Vue): переиспользуется при любом выборе библиотеки графиков (BACKLOG 19, 12:29).

export interface VariationShare {
  label: string | null // null — подходы без особенности
  reps: number
}

// Цвета особенностей зависят от темы оформления (BACKLOG 13:55): каждая тема задаёт токены --chart-1…--chart-8, --chart-none и
// --chart-other (scripts/themes_data.py -> style.css; первая особенность — акцент темы, остальные различимы между собой и
// читаются на карточке темы, контраст >= 3:1). Здесь отдаём `var(--chart-N, <запасной hex>)`: смена темы перекрашивает графики сразу,
// а вне темы (тесты, нестандартная страница) работает запасная палитра. var() в атрибутах fill/stroke SVG и в style браузеры понимают.
export const VARIATION_PALETTE: readonly string[] = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'] // запасные значения
export const NONE_FALLBACK = '#9aa0a6' // подходы без особенности
export const OTHER_FALLBACK = '#6b7280' // особенностей больше, чем цветов в палитре — хвост
export const chartVar = (index: number): string => `var(--chart-${index + 1}, ${VARIATION_PALETTE[index]})`
export const NONE_COLOR = `var(--chart-none, ${NONE_FALLBACK})`
export const OTHER_COLOR = `var(--chart-other, ${OTHER_FALLBACK})`

// Название особенности как ключ: пробелы по краям не различают, пусто = «без особенности».
export function normalizeVariation(v: string | null | undefined): string | null {
  const s = (v ?? '').trim()
  return s === '' ? null : s
}

// Доли одного дня: суммарные повторения по каждой особенности (подходы без повторений не считаются).
// Порядок — по `order` (стабильный порядок особенностей метрики), «без особенности» — в конце.
export function dayShares(value: unknown, order: readonly string[] = []): VariationShare[] {
  const sums = new Map<string | null, number>()
  for (const s of normalizeSets(value)) {
    const reps = s.reps ?? 0
    if (!(reps > 0)) continue
    const key = normalizeVariation(s.variation)
    sums.set(key, (sums.get(key) ?? 0) + reps)
  }
  const rank = (label: string | null) => {
    if (label === null) return Number.MAX_SAFE_INTEGER
    const i = order.indexOf(label)
    return i === -1 ? Number.MAX_SAFE_INTEGER - 1 : i
  }
  return [...sums.entries()]
    .map(([label, reps]) => ({ label, reps }))
    .sort((a, b) => rank(a.label) - rank(b.label) || String(a.label).localeCompare(String(b.label)))
}

// Стабильный порядок особенностей метрики по ВСЕЙ истории: по дате первого появления, при равенстве — по алфавиту.
// Цвет привязан к месту в этом порядке, поэтому не «прыгает» при смене периода и появлении новых особенностей
// (новая получает следующий цвет, а у прежних цвета не меняются).
export function variationOrder(days: { date: string; value: unknown }[]): string[] {
  const first = new Map<string, string>()
  for (const d of days) {
    for (const s of normalizeSets(d.value)) {
      if (!((s.reps ?? 0) > 0)) continue
      const label = normalizeVariation(s.variation)
      if (label === null) continue
      const prev = first.get(label)
      if (prev === undefined || d.date < prev) first.set(label, d.date)
    }
  }
  return [...first.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0])).map(([label]) => label)
}

export function colorFor(label: string | null, order: readonly string[]): string {
  if (label === null) return NONE_COLOR
  const i = order.indexOf(label)
  if (i === -1) return OTHER_COLOR
  return i < VARIATION_PALETTE.length ? chartVar(i) : OTHER_COLOR
}

export interface LegendItem {
  label: string | null
  color: string
  reps: number // сумма повторений за показанный период
  today: number // сумма повторений за сегодняшний день (BACKLOG 22:02); 0, если сегодня нет в периоде или подходов не было
}

// Легенда: все особенности, встретившиеся в показанных точках, с суммой повторений за период и за сегодня
// (BACKLOG 22:02: «кроме общего числа — сколько за сегодня») — в стабильном порядке. `todayIso` — сегодняшняя дата ISO;
// точки без даты или другого дня в «сегодня» не попадают.
export function buildLegend(points: { date?: string; shares?: VariationShare[] }[], order: readonly string[], todayIso?: string): LegendItem[] {
  const sums = new Map<string | null, number>()
  const todaySums = new Map<string | null, number>()
  for (const p of points) {
    for (const s of p.shares ?? []) {
      sums.set(s.label, (sums.get(s.label) ?? 0) + s.reps)
      if (todayIso && p.date === todayIso) todaySums.set(s.label, (todaySums.get(s.label) ?? 0) + s.reps)
    }
  }
  const rank = (label: string | null) => (label === null ? Number.MAX_SAFE_INTEGER : order.indexOf(label) === -1 ? Number.MAX_SAFE_INTEGER - 1 : order.indexOf(label))
  return [...sums.entries()]
    .map(([label, reps]) => ({ label, color: colorFor(label, order), reps, today: todaySums.get(label) ?? 0 }))
    .sort((a, b) => rank(a.label) - rank(b.label))
}

// Нужна ли «цветная» отрисовка: хоть где-то есть особенность с названием. Если у всех подходов особенности нет — график
// остаётся обычным (точки одного цвета линии), без пустой серой легенды.
export function hasNamedVariations(points: { shares?: VariationShare[] }[]): boolean {
  return points.some((p) => (p.shares ?? []).some((s) => s.label !== null))
}

export interface PieSlice {
  color: string
  label: string | null
  reps: number
  // сплошной круг (одна особенность) — path пустой, рисуется <circle>
  full: boolean
  path: string
}

const r1 = (n: number) => Math.round(n * 100) / 100

// Секторы круга радиуса r с центром (cx, cy): доли равномерно по числу повторений, начало — сверху, по часовой стрелке.
export function pieSlices(shares: VariationShare[], order: readonly string[], cx: number, cy: number, r: number): PieSlice[] {
  const live = shares.filter((s) => s.reps > 0)
  const total = live.reduce((sum, s) => sum + s.reps, 0)
  if (total <= 0) return []
  if (live.length === 1) return [{ color: colorFor(live[0].label, order), label: live[0].label, reps: live[0].reps, full: true, path: '' }]
  const out: PieSlice[] = []
  let start = -Math.PI / 2
  for (const s of live) {
    const angle = (s.reps / total) * Math.PI * 2
    const end = start + angle
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const large = angle > Math.PI ? 1 : 0
    out.push({
      color: colorFor(s.label, order),
      label: s.label,
      reps: s.reps,
      full: false,
      path: `M${r1(cx)} ${r1(cy)} L${r1(x1)} ${r1(y1)} A${r1(r)} ${r1(r)} 0 ${large} 1 ${r1(x2)} ${r1(y2)} Z`,
    })
    start = end
  }
  return out
}

// Текст подсказки: «50 классических · 30 алмазных · 20 на бицепс»; «без особенности» подставляет вызывающий код (i18n).
export function describeShares(shares: VariationShare[], noneLabel: string): string {
  return shares
    .filter((s) => s.reps > 0)
    .map((s) => `${s.reps} ${s.label ?? noneLabel}`)
    .join(' · ')
}

// Экранирование текста пользователя (названия особенностей) для SVG, который собирается строкой и вставляется через v-html.
export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// BACKLOG 952 (владелец: «хочу рекорд — сколько максимум в подходе какого типа»): рекорд по каждой особенности — наибольшее число
// повторений в ОДНОМ подходе этого типа за всё время (не сумма за день) и дата. Подходы без повторений не считаются; при равенстве —
// самая ранняя дата (как у `bestRecord`). Порядок — по `order`, «без особенности» — в конце. Только чистая логика.
export interface VariationRecord {
  label: string | null
  y: number
  date: string
}
export function variationMaxima(days: { date: string; value: unknown }[], order: readonly string[] = []): VariationRecord[] {
  const best = new Map<string | null, VariationRecord>()
  for (const d of days) {
    for (const s of normalizeSets(d.value)) {
      const reps = s.reps ?? 0
      if (!(reps > 0)) continue
      const label = normalizeVariation(s.variation)
      const cur = best.get(label)
      if (!cur || reps > cur.y || (reps === cur.y && d.date < cur.date)) best.set(label, { label, y: reps, date: d.date })
    }
  }
  const rank = (label: string | null) => (label === null ? Number.MAX_SAFE_INTEGER : order.indexOf(label) === -1 ? Number.MAX_SAFE_INTEGER - 1 : order.indexOf(label))
  return [...best.values()].sort((a, b) => rank(a.label) - rank(b.label) || String(a.label).localeCompare(String(b.label)))
}

