// «Серия по неделям» (BACKLOG 44.5д, срез 3): сколько недель подряд (пн–вс) была хотя бы одна тренировка. Тренировка — любой день, где есть запись
// хотя бы с одним подходом. Текущая неделя серию НЕ рвёт, пока она не закончилась: если на ней ещё нет тренировок, серия считается до прошлой недели.
// Чистые функции без обращения к DOM.
import { addDaysIso, mondayOf } from './date'
import type { WorkoutEntry } from './types'

export interface WeekBar {
  /** понедельник недели, ГГГГ-ММ-ДД */
  monday: string
  /** сколько разных дней с тренировкой было на этой неделе */
  days: number
}

export interface WeekStreakInfo {
  current: number
  best: number
  thisWeekDays: number
  /** последние `weeks` недель, от старой к новой; последняя — текущая */
  bars: WeekBar[]
}

// Дни, в которые что-то делали (запись с хотя бы одним подходом)
export function trainedDays(entries: WorkoutEntry[]): Set<string> {
  const out = new Set<string>()
  for (const e of entries) if ((e.sets?.length ?? 0) > 0) out.add(e.date)
  return out
}

export function weekStreak(entries: WorkoutEntry[], today: string, weeks = 8): WeekStreakInfo {
  const days = trainedDays(entries)
  const perWeek = new Map<string, number>()
  for (const d of days) {
    const m = mondayOf(d)
    perWeek.set(m, (perWeek.get(m) ?? 0) + 1)
  }
  const thisMonday = mondayOf(today)
  const thisWeekDays = perWeek.get(thisMonday) ?? 0

  // Текущая серия: назад от текущей недели (если на ней ещё пусто — от прошлой)
  let cursor = thisWeekDays > 0 ? thisMonday : addDaysIso(thisMonday, -7)
  let current = 0
  while (perWeek.has(cursor)) {
    current++
    cursor = addDaysIso(cursor, -7)
  }

  // Лучшая серия за всё время: идём по неделям с тренировками по порядку
  const mondays = [...perWeek.keys()].sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const m of mondays) {
    run = prev !== null && addDaysIso(prev, 7) === m ? run + 1 : 1
    if (run > best) best = run
    prev = m
  }

  const bars: WeekBar[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const monday = addDaysIso(thisMonday, -7 * i)
    bars.push({ monday, days: perWeek.get(monday) ?? 0 })
  }
  return { current, best, thisWeekDays, bars }
}
