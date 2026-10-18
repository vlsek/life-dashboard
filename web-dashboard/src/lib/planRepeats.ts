import { addDaysIso, mondayOf, weekdayOf } from './date'
import type { PlannedEntry } from './planned'

// Повторяющиеся пункты плана (BACKLOG 1054, миграция 087). Расписание — тот же вид, что у metrics.schedule (kinds: каждый день / по дням недели /
// N раз в неделю); «не чаще N раз» (at_most) для плана смысла не имеет и не поддерживается.
export type RepeatSchedule = null | { type: 'days'; days: number[] } | { type: 'weekly'; min: number }
export type RepeatKind = 'daily' | 'days' | 'weekly'

export interface PlanRepeat {
  id: string
  text: string
  time: string | null
  schedule: RepeatSchedule
}

// Понедельник — первым (как в метриках и календаре): подписи дней недели идут в этом порядке.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

// Расписание из того, что пришло из базы (мусор → «каждый день»).
export function normalizeRepeatSchedule(s: unknown): RepeatSchedule {
  if (!s || typeof s !== 'object') return null
  const o = s as { type?: unknown; days?: unknown; min?: unknown }
  if (o.type === 'days' && Array.isArray(o.days)) {
    const days = [...new Set(o.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b)
    return days.length > 0 && days.length < 7 ? { type: 'days', days } : null
  }
  if (o.type === 'weekly' && typeof o.min === 'number' && o.min >= 1) return { type: 'weekly', min: Math.min(7, Math.floor(o.min)) }
  return null
}

// Расписание из значений формы: «по дням» с 0 или 7 днями = каждый день.
export function buildRepeatSchedule(kind: RepeatKind, days: number[], perWeek: number): RepeatSchedule {
  if (kind === 'days') return normalizeRepeatSchedule({ type: 'days', days })
  if (kind === 'weekly') return { type: 'weekly', min: Math.min(7, Math.max(1, Math.trunc(perWeek) || 1)) }
  return null
}

export function repeatKindOf(s: RepeatSchedule): RepeatKind {
  return s?.type ?? 'daily'
}

// Строка из базы → пункт (мусор в расписании не роняет).
export function toPlanRepeat(row: { id: string; text: string; time?: string | null; schedule?: unknown }): PlanRepeat {
  return { id: row.id, text: row.text, time: row.time ?? null, schedule: normalizeRepeatSchedule(row.schedule) }
}

// Сколько раз пункт отмечен за неделю (пн–вс), в которую входит `day`: по заметкам недели (кроме самого `day`) + по плану `day`.
export function weekDoneCount(repeatId: string, day: string, planToday: PlannedEntry[], weekNotes: { date: string; entries: PlannedEntry[] }[]): number {
  const isDone = (e: PlannedEntry) => e.repeat === repeatId && !!e.done
  const monday = mondayOf(day)
  const sunday = addDaysIso(monday, 6)
  let n = planToday.filter(isDone).length
  for (const w of weekNotes) if (w.date !== day && w.date >= monday && w.date <= sunday) n += w.entries.filter(isDone).length
  return n
}

// Какие повторяющиеся пункты предложить на день `day`: «каждый день» и «по дням» — по расписанию; «N раз в неделю» — пока за неделю
// отмечено меньше N. Пункт, который уже есть в плане этого дня (по repeat), второй раз не предлагается.
export function repeatsDueOn(repeats: PlanRepeat[], day: string, planToday: PlannedEntry[], weekNotes: { date: string; entries: PlannedEntry[] }[]): PlanRepeat[] {
  return repeats.filter((r) => {
    if (planToday.some((e) => e.repeat === r.id)) return false
    const s = r.schedule
    if (!s) return true
    if (s.type === 'days') return s.days.includes(weekdayOf(day))
    return weekDoneCount(r.id, day, planToday, weekNotes) < s.min
  })
}

// Что придётся на БУДУЩИЙ день `day` по расписанию (BACKLOG 1054 срез 2): только «каждый день» и «по дням недели» — их день известен заранее;
// «N раз в неделю» заранее не расписать (зависит от отметок), поэтому здесь его нет. Пункт, уже стоящий в плане этого дня, не дублируется.
export function repeatsScheduledOn(repeats: PlanRepeat[], day: string, planDay: PlannedEntry[]): PlanRepeat[] {
  return repeats.filter((r) => {
    if (planDay.some((e) => e.repeat === r.id)) return false
    const s = r.schedule
    if (!s) return true
    return s.type === 'days' && s.days.includes(weekdayOf(day))
  })
}

// Краткая подпись расписания: «каждый день», «Пн Ср Пт», «3 раза в неделю». weekdayNames — 7 подписей, понедельник первым.
export function repeatSummary(s: RepeatSchedule, weekdayNames: string[], everyDay: string, perWeek: (n: number) => string): string {
  if (!s) return everyDay
  if (s.type === 'days') return WEEK_ORDER.filter((d) => s.days.includes(d)).map((d) => weekdayNames[WEEK_ORDER.indexOf(d)]).join(' ')
  return perWeek(s.min)
}
