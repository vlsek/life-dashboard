// Замеры частей тела (BACKLOG 57.1, миграция 074). Чистая логика: список частей, проверка ввода, «последнее / предыдущее / разница», точки мини-графика.
export const PARTS = ['neck', 'shoulders', 'chest', 'waist', 'hips', 'biceps_l', 'biceps_r', 'forearm_l', 'forearm_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r'] as const
export type PartId = (typeof PARTS)[number]

export interface Measurement {
  id: string
  date: string // YYYY-MM-DD
  part: PartId
  value_cm: number
}

export const MIN_CM = 1
export const MAX_CM = 300

export const isPart = (v: unknown): v is PartId => typeof v === 'string' && (PARTS as readonly string[]).includes(v)

// Ввод «34,5» / «34.5» → число с одним знаком; вне 1..300 или не число — null
export function parseCm(raw: string | number): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < MIN_CM || n > MAX_CM) return null
  return Math.round(n * 10) / 10
}

// Разбор строк из БД: чужие/битые строки отбрасываем (numeric приходит строкой)
export function normalizeRows(raw: unknown): Measurement[] {
  if (!Array.isArray(raw)) return []
  const out: Measurement[] = []
  for (const r of raw as Record<string, unknown>[]) {
    const v = Number(r?.value_cm)
    if (r && isPart(r.part) && typeof r.date === 'string' && typeof r.id === 'string' && Number.isFinite(v)) out.push({ id: r.id, date: r.date, part: r.part, value_cm: v })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export const seriesFor = (rows: readonly Measurement[], part: PartId): Measurement[] => rows.filter((r) => r.part === part)

export interface PartSummary {
  part: PartId
  last: Measurement
  prev: Measurement | null
  delta: number | null // last − prev, один знак
}

// Только части, по которым есть хоть один замер, в порядке PARTS
export function summarize(rows: readonly Measurement[]): PartSummary[] {
  const out: PartSummary[] = []
  for (const part of PARTS) {
    const s = seriesFor(rows, part)
    if (!s.length) continue
    const last = s[s.length - 1]
    const prev = s.length > 1 ? s[s.length - 2] : null
    out.push({ part, last, prev, delta: prev ? Math.round((last.value_cm - prev.value_cm) * 10) / 10 : null })
  }
  return out
}

export function formatDelta(d: number | null): string {
  if (d === null) return ''
  if (d === 0) return '±0'
  return (d > 0 ? '+' : '−') + String(Math.abs(d)).replace('.', ',')
}

// Мини-график: точки в рамке w×h с отступом pad; одна точка — по центру; значения одинаковые — ровная линия посередине
export function sparkPoints(series: readonly Measurement[], w = 120, h = 32, pad = 3): { x: number; y: number }[] {
  if (!series.length) return []
  const vals = series.map((s) => s.value_cm)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min
  return series.map((s, i) => ({
    x: series.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (series.length - 1),
    y: span === 0 ? h / 2 : pad + (1 - (s.value_cm - min) / span) * (h - 2 * pad),
  }))
}
