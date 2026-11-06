// Главная раздела «Тренировки» (BACKLOG 69.17, срез 2): «Недавние тренировки» — последние карточки из журнала. Только чтение уже загруженного.
import type { Exercise, WorkoutEntry } from './types'
import { journalDays, splitByWorkout } from './journal'
import { sessionMinutes } from './sessionContract'
import type { SetV2, WorkoutSession } from './sessionContract'

export const RECENT_LIMIT = 2
export const RECENT_TOP = 2 // сколько упражнений показать в строке карточки

export interface RecentCard {
  key: string
  date: string
  name: string | null // название тренировки (если дали); иначе подпись «Тренировка» подставит вид
  minutes: number | null
  sets: number
  volume: number
  top: { name: string; best: SetV2 }[]
  records: number // сколько упражнений в этой тренировке дали рекорд
}

// Свежие тренировки сверху (по дням с записями, внутри дня — по началу сессии). Берём окно побольше лимита,
// чтобы день с несколькими тренировками не съел весь лимит.
export function recentCards(entries: readonly WorkoutEntry[], exercises: readonly Exercise[], sessions: readonly WorkoutSession[], nowMs: number, limit = RECENT_LIMIT): RecentCard[] {
  const cards = splitByWorkout(journalDays(entries, exercises, limit + 5), sessions).slice(0, limit)
  return cards.map((c) => ({
    key: c.key,
    date: c.date,
    name: c.session?.name?.trim() || null,
    minutes: sessionMinutes(c.session, nowMs),
    sets: c.setCount,
    volume: c.volume,
    top: c.items.filter((i) => i.best).slice(0, RECENT_TOP).map((i) => ({ name: i.exercise.name, best: i.best as SetV2 })),
    records: c.items.filter((i) => i.record).length,
  }))
}

export type DayKind = 'today' | 'yesterday' | 'date'
export function dayKind(date: string, today: string): DayKind {
  if (date === today) return 'today'
  const [y, m, d] = today.split('-').map(Number)
  const prev = new Date(y, m - 1, d - 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return date === `${prev.getFullYear()}-${p(prev.getMonth() + 1)}-${p(prev.getDate())}` ? 'yesterday' : 'date'
}
