// Лента вех на год (BACKLOG 76.10): прошедшие выполнения и будущие плановые даты по месяцам. Чистые функции, без обращения к странице.
import { addInterval } from './milestones'
import type { Milestone } from './types'

export type TimelineKind = 'done' | 'planned' | 'overdue'

export interface TimelineEvent {
  date: string // ISO
  kind: TimelineKind
  id: string
  name: string
  category: string
  km: number | null
  note: string | null
}

export interface TimelineMonth {
  month: number // 0..11
  events: TimelineEvent[]
}

const MAX_REPEATS = 400 // предохранитель от бесконечных рядов (интервал 1 день × много лет)
const isIso = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
const todayIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// События одного года. «Сделано» — записи истории и дата последнего выполнения (без дублей по дню).
// «Запланировано» — ближайшая дата `due_date` и её повторы по интервалу (только для вех, которые ещё не закрыты и имеют интервал по времени);
// ближайшая дата в прошлом — «просрочено». Интервал только в километрах даты не даёт — для ленты такая веха показывает лишь прошлые выполнения.
export function buildYearTimeline(items: Milestone[], year: number, today: Date = new Date()): TimelineMonth[] {
  const months: TimelineMonth[] = Array.from({ length: 12 }, (_, month) => ({ month, events: [] }))
  const t = todayIso(today)
  const put = (e: TimelineEvent) => {
    const m = /^(\d{4})-(\d{2})-/.exec(e.date)
    if (!m || Number(m[1]) !== year) return
    months[Number(m[2]) - 1].events.push(e)
  }
  for (const m of items) {
    const base = { id: m.id, name: m.name, category: m.category, km: null as number | null, note: null as string | null }
    const seen = new Set<string>()
    for (const h of Array.isArray(m.history) ? m.history : []) {
      if (!isIso(h.date) || seen.has(h.date)) continue
      seen.add(h.date)
      put({ ...base, date: h.date, kind: 'done', km: h.km ?? null, note: h.note ?? null })
    }
    if (isIso(m.last_date) && !seen.has(m.last_date)) put({ ...base, date: m.last_date, kind: 'done' })
    if (m.done || !isIso(m.due_date)) continue
    put({ ...base, date: m.due_date, kind: m.due_date < t ? 'overdue' : 'planned' })
    const v = m.interval_value ?? 0
    if (v > 0 && m.interval_unit) {
      let d = m.due_date
      for (let i = 0; i < MAX_REPEATS; i++) {
        d = addInterval(d, v, m.interval_unit)
        if (Number(d.slice(0, 4)) > year) break
        put({ ...base, date: d, kind: d < t ? 'overdue' : 'planned' })
      }
    }
  }
  for (const mo of months) mo.events.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
  return months
}

export function timelineTotals(months: TimelineMonth[]): { done: number; planned: number; overdue: number } {
  const out = { done: 0, planned: 0, overdue: 0 }
  for (const mo of months) for (const e of mo.events) out[e.kind]++
  return out
}
