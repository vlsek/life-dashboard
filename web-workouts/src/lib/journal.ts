// «Сегодня» и «Журнал» (BACKLOG 44.5б, срез 1): записи по дням одним списком — без перебора карточек упражнений.
// Чистые функции: даты приходят строками YYYY-MM-DD, DOM и localStorage не трогаем.
import type { Exercise, WorkoutEntry } from './types'
import { PR_ORDER, e1rm, setRecords, topKind } from './records'
import type { PRKind } from './records'
import { isDone, isWorking, setsVolume } from './sessionContract'
import { sessionMinutes } from './sessionContract'
import type { SetV2, WorkoutSession } from './sessionContract'

export interface JournalItem {
  entry: WorkoutEntry
  exercise: Exercise
  // Лента истории (BACKLOG 69.11, срез 1): лучший рабочий подход записи и главный рекорд дня (относительно записей ДО этого дня). Заполняет journalDays.
  best?: SetV2 | null
  record?: PRKind | null
}
export interface JournalDay {
  date: string
  items: JournalItem[]
  setCount: number
  // Срез 2 (69.11): объём дня = Σ вес×повторы рабочих подходов (0 — нет подходов с весом)
  volume?: number
}

const firstTime = (e: WorkoutEntry): string => e.sets.find((s) => s.time)?.time ?? '99:99'

// Записи одного дня с известным упражнением (удалённые упражнения пропускаем), по времени первого подхода
function itemsOf(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], day: string): JournalItem[] {
  const byId = new Map(exercises.map((x) => [x.id, x]))
  const out: JournalItem[] = []
  for (const entry of entries) {
    if (entry.date !== day) continue
    const exercise = byId.get(entry.exercise_id)
    if (exercise) out.push({ entry, exercise })
  }
  return out.sort((a, b) => firstTime(a.entry).localeCompare(firstTime(b.entry)))
}

export const todayItems = (entries: readonly WorkoutEntry[], exercises: readonly Exercise[], day: string): JournalItem[] => itemsOf(entries, exercises, day)

export const countSets = (items: readonly JournalItem[]): number => items.reduce((n, i) => n + i.entry.sets.length, 0)

// Дни с записями, свежие сверху; не больше `limit` дней (по умолчанию 30)
export function journalDays(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], limit = 30, month: string | null = null, query = '', onlyDate: string | null = null, onlyEntryIds: ReadonlySet<string> | null = null): JournalDay[] {
  const q = query.trim().toLowerCase()
  const dates = [...new Set(entries.map((e) => e.date))].filter((d) => !month || d.startsWith(month)).filter((d) => !onlyDate || d === onlyDate).sort().reverse()
  const days: JournalDay[] = []
  for (const date of dates) {
    const items = itemsOf(entries, exercises, date).filter((i) => !onlyEntryIds || onlyEntryIds.has(i.entry.id)).filter((i) => !q || i.exercise.name.toLowerCase().includes(q)) // поиск (69.11 срез 3): по названию упражнения
    if (items.length === 0) continue
    for (const i of items) { i.best = bestSet(i.entry.sets as SetV2[]); i.record = entryRecord(i.entry, entries) }
    days.push({ date, items, setCount: countSets(items), volume: dayVolume(items) })
    if (days.length >= limit) break
  }
  return days
}

// Лучший рабочий подход: с весом — по оценке 1ПМ, без веса — по повторам, на время — по длительности. Нет подходов с значением — null.
const score = (s: SetV2): number => ((s.weight ?? 0) > 0 && (s.reps ?? 0) > 0 ? e1rm(s.weight as number, s.reps as number) : (s.reps ?? 0) > 0 ? (s.reps as number) : (s.duration ?? 0))
export function bestSet(sets: readonly SetV2[]): SetV2 | null {
  let best: SetV2 | null = null
  for (const s of sets) {
    if (!isWorking(s) || score(s) <= 0) continue
    if (best === null || score(s) > score(best)) best = s
  }
  return best
}

// Главный рекорд записи: подходы дня против истории упражнения строго ДО этой даты (записи того же дня рекорда друг другу не дают)
export function entryRecord(entry: WorkoutEntry, entries: readonly WorkoutEntry[]): PRKind | null {
  const history = entries.filter((e) => e.exercise_id === entry.exercise_id && e.date < entry.date)
  const sets = (entry.sets as SetV2[]).map((s) => ({ ...s, done: isDone(s) }))
  const kinds = setRecords(history as { sets: SetV2[] }[], sets).flat()
  return topKind([...new Set(kinds)].sort((a, b) => PR_ORDER.indexOf(a) - PR_ORDER.indexOf(b)))
}

export const dayVolume = (items: readonly JournalItem[]): number => items.reduce((n, i) => n + setsVolume(i.entry.sets as SetV2[]), 0)

// Месяцы (YYYY-MM), в которых есть записи, свежие сверху — для фильтра ленты
export const journalMonths = (entries: readonly WorkoutEntry[]): string[] => [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort().reverse()

export interface CalCell { date: string | null; day: number; active: boolean }

// Сетка месяца (69.11 срез 4): недели с понедельника; пустые клетки date=null; active — в этот день есть записи
export function monthGrid(month: string, activeDates: ReadonlySet<string>): CalCell[][] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const lead = (first.getUTCDay() + 6) % 7
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: CalCell[] = []
  for (let i = 0; i < lead; i++) cells.push({ date: null, day: 0, active: false })
  for (let d = 1; d <= total; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`
    cells.push({ date, day: d, active: activeDates.has(date) })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: 0, active: false })
  const weeks: CalCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

// Длительность тренировок за день, мин (69.11 срез 5): только ЗАВЕРШЁННЫЕ сессии этой даты, сумма; 0 — нет данных (неявная тренировка, ручная запись без времени)
export function dayMinutes(sessions: readonly WorkoutSession[], date: string): number {
  return sessions.reduce((n, s) => (s.date === date && s.finished_at ? n + (sessionMinutes(s, 0) ?? 0) : n), 0)
}

// Фильтр по рутине (69.11 срез 6): записи, чья сессия запущена по этой рутине (session_id → routine_id)
export function entryIdsOfRoutine(entries: readonly WorkoutEntry[], sessions: readonly WorkoutSession[], routineId: string): Set<string> {
  const sids = new Set(sessions.filter((s) => s.routine_id === routineId).map((s) => s.id))
  return new Set(entries.filter((e) => e.session_id != null && sids.has(e.session_id)).map((e) => e.id))
}

// Рутины, по которым есть тренировки в ленте: только известные (удалённая рутина в списке не нужна), в порядке списка рутин
export function routinesWithWorkouts<R extends { id: string }>(routines: readonly R[], sessions: readonly WorkoutSession[]): R[] {
  const used = new Set(sessions.map((s) => s.routine_id).filter((x): x is string => !!x))
  return routines.filter((r) => used.has(r.id))
}
