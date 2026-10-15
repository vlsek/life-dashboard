// «Сегодня» и «Журнал» (BACKLOG 44.5б, срез 1): записи по дням одним списком — без перебора карточек упражнений.
// Чистые функции: даты приходят строками YYYY-MM-DD, DOM и localStorage не трогаем.
import type { Exercise, WorkoutEntry } from './types'

export interface JournalItem {
  entry: WorkoutEntry
  exercise: Exercise
}
export interface JournalDay {
  date: string
  items: JournalItem[]
  setCount: number
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
export function journalDays(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], limit = 30): JournalDay[] {
  const dates = [...new Set(entries.map((e) => e.date))].sort().reverse()
  const days: JournalDay[] = []
  for (const date of dates) {
    const items = itemsOf(entries, exercises, date)
    if (items.length === 0) continue
    days.push({ date, items, setCount: countSets(items) })
    if (days.length >= limit) break
  }
  return days
}
