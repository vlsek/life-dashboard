import { ref } from 'vue'
import { sb } from './supabase'
import { fmtDate } from './date'
import { normalizePlanned } from './planned'

// Виджет «Календарь» главной (BACKLOG 940, часть 2): месяц с отметками планов и сроков целей. Те же данные, что на странице
// /calendar/ (daily_notes.planned_goals и goals.deadline), только чтение. Копия логики — пилоты изолированы.
export type CalendarWidgetState = 'loading' | 'ready'

export interface DayMark {
  plan: number // пунктов плана на день
  planDone: number
  deadlines: number // целей со сроком на день
  deadlinesOpen: number
}
export interface CalendarCell {
  day: number
  dateStr: string
  isToday: boolean
  mark: DayMark | null
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  return { from: fmtDate(new Date(year, month, 1)), to: fmtDate(new Date(year, month + 1, 0)) }
}

// Понедельник = 0: `offset` пустых ячеек в начале месяца и по ячейке на каждый день.
export function monthCells(year: number, month: number, marks: Record<string, DayMark>, todayIso: string): (CalendarCell | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const cells: (CalendarCell | null)[] = new Array(offset).fill(null)
  const last = new Date(year, month + 1, 0).getDate()
  for (let day = 1; day <= last; day++) {
    const dateStr = fmtDate(new Date(year, month, day))
    cells.push({ day, dateStr, isToday: dateStr === todayIso, mark: marks[dateStr] ?? null })
  }
  return cells
}

export function buildMarks(
  notes: { date: string; planned_goals: unknown }[] | null | undefined,
  goals: { deadline: string | null; done: boolean | null }[] | null | undefined,
): Record<string, DayMark> {
  const out: Record<string, DayMark> = {}
  const at = (d: string) => (out[d] ||= { plan: 0, planDone: 0, deadlines: 0, deadlinesOpen: 0 })
  for (const n of notes || []) {
    const items = normalizePlanned(n.planned_goals)
    if (items.length === 0) continue
    const m = at(n.date)
    m.plan = items.length
    m.planDone = items.filter((p) => p.done).length
  }
  for (const g of goals || []) {
    if (!g.deadline) continue
    const m = at(g.deadline)
    m.deadlines += 1
    if (!g.done) m.deadlinesOpen += 1
  }
  return out
}

export function useCalendarWidget() {
  const state = ref<CalendarWidgetState>('loading')
  const marks = ref<Record<string, DayMark>>({})
  let seq = 0

  // Сама сетка рисуется сразу; сбой чтения отметок — просто месяц без отметок (виджет не пропадает).
  async function load(userId: string, year: number, month: number) {
    const my = ++seq
    state.value = 'ready'
    const { from, to } = monthRange(year, month)
    const [notes, goals] = await Promise.all([
      sb.from('daily_notes').select('date, planned_goals').eq('user_id', userId).gte('date', from).lte('date', to),
      sb.from('goals').select('deadline, done').eq('user_id', userId).gte('deadline', from).lte('deadline', to),
    ])
    if (my !== seq) return // ответ устаревшего месяца
    marks.value = buildMarks(notes.error ? [] : notes.data, goals.error ? [] : goals.data)
  }

  return { state, marks, load }
}
