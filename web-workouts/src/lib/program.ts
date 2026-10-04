import { parseIso, todayStr } from './date'

// «Прогрессивные программы» (BACKLOG 3.3, остаток): активная программа пользователя — какая, с какого дня и какие недели пройдены.
// Чистая логика без сети; хранение — programSync.ts (profiles.workout_program, миграция 040, + localStorage как запасной слой).
// Формат (тот же, что в миграции 040): { templateId, startDate: 'ГГГГ-ММ-ДД', doneWeeks: [0, 1] } — недели с нуля (0 = «Неделя 1»).
export interface ActiveProgram {
  templateId: string
  startDate: string
  doneWeeks: number[]
}

export const PROGRAM_KEY = 'workout_program'
export const PROGRAM_EVENT = 'workout-program:changed'

const ISO = /^\d{4}-\d{2}-\d{2}$/

function validIso(v: unknown): v is string {
  return typeof v === 'string' && ISO.test(v) && !Number.isNaN(parseIso(v).getTime())
}

// Только корректный объект; номера недель — целые, без дублей, по возрастанию, в пределах программы (если число недель известно).
export function normalizeProgram(raw: unknown, weeksCount?: number): ActiveProgram | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as { templateId?: unknown; startDate?: unknown; doneWeeks?: unknown }
  if (typeof r.templateId !== 'string' || !r.templateId.trim() || !validIso(r.startDate)) return null
  const weeks = Array.isArray(r.doneWeeks)
    ? r.doneWeeks.filter((n): n is number => Number.isInteger(n) && n >= 0 && (weeksCount == null || n < weeksCount))
    : []
  return { templateId: r.templateId.trim(), startDate: r.startDate, doneWeeks: [...new Set(weeks)].sort((a, b) => a - b) }
}

export function startProgram(templateId: string, today: string = todayStr()): ActiveProgram {
  return { templateId, startDate: today, doneWeeks: [] }
}

// Целых дней от a до b (по календарю, без сдвига из-за перехода на летнее время).
export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86400000)
}

export interface ProgramStatus {
  state: 'active' | 'finished'
  /** текущая неделя с нуля (для finished — последняя) */
  weekIndex: number
  /** сколько дней осталось до следующей недели (включая сегодня); 0 у завершённой */
  daysLeftInWeek: number
  doneCount: number
  total: number
}

// Дни 0–6 от старта — неделя 1 и т. д. Раньше старта (часы/пояс другого устройства) — считаем первой неделей.
// Завершена: прошли все недели по календарю или все недели отмечены пройденными.
export function programStatus(p: ActiveProgram, total: number, today: string = todayStr()): ProgramStatus {
  const days = Math.max(0, daysBetween(p.startDate, today))
  const doneCount = p.doneWeeks.filter((n) => n < total).length
  const calendarOver = days >= total * 7
  const allDone = total > 0 && doneCount >= total
  if (calendarOver || allDone) return { state: 'finished', weekIndex: Math.max(0, total - 1), daysLeftInWeek: 0, doneCount, total }
  const weekIndex = Math.floor(days / 7)
  return { state: 'active', weekIndex, daysLeftInWeek: 7 - (days % 7), doneCount, total }
}

export function toggleWeekDone(p: ActiveProgram, week: number): ActiveProgram {
  const done = p.doneWeeks.includes(week) ? p.doneWeeks.filter((n) => n !== week) : [...p.doneWeeks, week]
  return { ...p, doneWeeks: [...new Set(done)].sort((a, b) => a - b) }
}

export function readProgram(): ActiveProgram | null {
  try {
    return normalizeProgram(JSON.parse(localStorage.getItem(PROGRAM_KEY) || 'null'))
  } catch {
    return null
  }
}

export function writeProgram(p: ActiveProgram | null): void {
  const clean = p ? normalizeProgram(p) : null
  try {
    if (clean) localStorage.setItem(PROGRAM_KEY, JSON.stringify(clean))
    else localStorage.removeItem(PROGRAM_KEY)
  } catch {
    /* приватный режим: программа сохранится только в профиле */
  }
  window.dispatchEvent(new CustomEvent(PROGRAM_EVENT, { detail: clean }))
}
