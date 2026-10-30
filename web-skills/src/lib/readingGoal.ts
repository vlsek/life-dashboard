// Годовая цель чтения (BACKLOG 77.4, срез 1): считаем по прочитанным книгам с `done_date` в выбранном году. Цель хранится на устройстве (localStorage).
export interface DoneBookLike {
  status: string
  done_date: string | null // ISO YYYY-MM-DD
}

export interface ReadingStats {
  year: number
  goal: number
  done: number
  pct: number // 0..100, кольцо (до 100, даже если цель перевыполнена)
  expected: number // сколько «положено» к сегодняшнему дню при ровном темпе
  diff: number // done − expected (может быть дробным)
  state: 'ahead' | 'behind' | 'even' | 'noGoal' | 'done'
  gap: number // целое число книг для подписи «опережаешь/отстаёшь на N» (0 при even)
  perMonth: number[] // 12 значений
  avgPerMonth: number // средний темп: прочитано / прошедшие месяцы (в текущем году — с учётом доли текущего месяца)
}

export const READING_GOAL_KEY = (year: number) => `reading_goal_${year}`
export const MAX_GOAL = 999

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
const daysInYear = (y: number) => (isLeap(y) ? 366 : 365)
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getFullYear(), 0, 1)
  const cur = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.floor((cur - start) / 86400000) + 1
}

export function clampGoal(v: unknown): number {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_GOAL, n) : 0
}

export function loadGoal(year: number): number {
  try {
    return clampGoal(localStorage.getItem(READING_GOAL_KEY(year)))
  } catch {
    return 0
  }
}

export function saveGoal(year: number, goal: number): number {
  const g = clampGoal(goal)
  try {
    if (g > 0) localStorage.setItem(READING_GOAL_KEY(year), String(g))
    else localStorage.removeItem(READING_GOAL_KEY(year))
  } catch {
    /* localStorage недоступен */
  }
  return g
}

export function perMonthCounts(books: DoneBookLike[], year: number): number[] {
  const out = Array<number>(12).fill(0)
  for (const b of books) {
    if (b.status !== 'done' || !b.done_date) continue
    const m = /^(\d{4})-(\d{2})-\d{2}/.exec(b.done_date)
    if (!m || Number(m[1]) !== year) continue
    const idx = Number(m[2]) - 1
    if (idx >= 0 && idx < 12) out[idx] += 1
  }
  return out
}

export function readingStats(books: DoneBookLike[], goal: number, now: Date = new Date()): ReadingStats {
  const year = now.getFullYear()
  const g = clampGoal(goal)
  const perMonth = perMonthCounts(books, year)
  const done = perMonth.reduce((a, b) => a + b, 0)
  const frac = dayOfYear(now) / daysInYear(year)
  const expected = g * frac
  const diff = done - expected
  const monthsElapsed = Math.max(frac * 12, 0.5) // в январе не делим на ~0
  let state: ReadingStats['state'] = 'noGoal'
  let gap = 0
  if (g > 0) {
    if (done >= g) state = 'done'
    else if (diff >= 0.5) { state = 'ahead'; gap = Math.round(diff) }
    else if (diff <= -0.5) { state = 'behind'; gap = Math.round(-diff) }
    else state = 'even'
  }
  return {
    year, goal: g, done,
    pct: g > 0 ? Math.min(100, Math.round((done / g) * 100)) : 0,
    expected, diff, state, gap, perMonth,
    avgPerMonth: Math.round((done / monthsElapsed) * 10) / 10,
  }
}

// Подпись единицы: «книга / книги / книг» (ru) и «book / books» (en).
export function booksWord(n: number, lang: 'ru' | 'en'): string {
  if (lang === 'en') return n === 1 ? 'book' : 'books'
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'книга'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'книги'
  return 'книг'
}
