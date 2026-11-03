// Рекорды прямо во время тренировки (BACKLOG 69.9, срез 1): чистая логика. Рабочие подходы выполненные (без разминки), история — записи ДО даты тренировки.
// Первый подход в жизни упражнения рекордом не считаем (шум), равное значение — не рекорд. Внутри одной тренировки планка растёт: второй такой же подход не рекорд.
import { isWorking } from './sessionContract'
import type { SetV2 } from './sessionContract'

export type PRKind = 'weight' | 'e1rm' | 'reps' | 'volume' | 'duration'
// Порядок важности: в плашке показываем один — самый важный
export const PR_ORDER: readonly PRKind[] = ['weight', 'e1rm', 'reps', 'volume', 'duration']

// Оценка 1ПМ по Эпли; один повтор = сам вес
export const e1rm = (weight: number, reps: number): number => (reps <= 1 ? weight : Math.round(weight * (1 + reps / 30) * 100) / 100)

interface Bests { any: boolean; weight: number; e1rm: number; repsAt: Map<number, number>; maxReps: number; volume: number; duration: number }
const empty = (): Bests => ({ any: false, weight: 0, e1rm: 0, repsAt: new Map(), maxReps: 0, volume: 0, duration: 0 })

function absorb(b: Bests, s: SetV2): void {
  const w = s.weight ?? 0, r = s.reps ?? 0, d = s.duration ?? 0
  if (r <= 0 && d <= 0) return
  b.any = true
  if (w > 0 && r > 0) {
    b.weight = Math.max(b.weight, w); b.e1rm = Math.max(b.e1rm, e1rm(w, r))
    b.repsAt.set(w, Math.max(b.repsAt.get(w) ?? 0, r)); b.volume = Math.max(b.volume, w * r)
  }
  if (r > 0) b.maxReps = Math.max(b.maxReps, r)
  if (d > 0) b.duration = Math.max(b.duration, d)
}

function kindsFor(b: Bests, s: SetV2): PRKind[] {
  if (!b.any) return []
  const w = s.weight ?? 0, r = s.reps ?? 0, d = s.duration ?? 0, out: PRKind[] = []
  if (w > 0 && r > 0) {
    if (w > b.weight) out.push('weight')
    if (e1rm(w, r) > b.e1rm) out.push('e1rm')
    const at = b.repsAt.get(w)
    if (at != null && r > at) out.push('reps')
    if (w * r > b.volume) out.push('volume')
  } else if (r > 0 && r > b.maxReps) out.push('reps') // без веса — просто максимум повторов
  if (d > 0 && b.duration > 0 && d > b.duration) out.push('duration')
  return PR_ORDER.filter((k) => out.includes(k))
}

// Для подходов одного упражнения в тренировке: на каждый индекс — список побитых рекордов (пусто — нет). Невыполненные и разминочные подходы рекордов не дают.
export function setRecords(history: readonly { sets: readonly SetV2[] }[], sets: readonly SetV2[]): PRKind[][] {
  const b = empty()
  for (const e of history) for (const s of e.sets || []) if (isWorking(s)) absorb(b, s)
  return sets.map((s) => {
    if (!isWorking(s) || s.done !== true) return []
    const k = kindsFor(b, s)
    absorb(b, s)
    return k
  })
}
export const topKind = (kinds: readonly PRKind[]): PRKind | null => kinds[0] ?? null

// Текст плашки: «62,5 кг × 8»
export const prSetText = (s: SetV2, unit: string): string => (s.weight ? `${String(s.weight).replace('.', ',')} ${unit} × ${s.reps ?? ''}`.trim() : s.reps ? String(s.reps) : s.duration ? `${s.duration}'` : '')

// Страница «Рекорды» упражнения (BACKLOG 69.9, срез 2): лучшие значения за всё время с датой, когда впервые достигнуты. Только рабочие подходы (разминка не считается).
export interface BestRow { value: number; date: string; weight: number | null; reps: number | null }
export interface ExerciseBests {
  weight: BestRow | null; e1rm: BestRow | null; volume: BestRow | null; reps: BestRow | null; duration: BestRow | null
  repsAt: { weight: number; reps: number; date: string }[] // макс. повторов на каждом весе, от тяжёлых к лёгким
}
export function exerciseBests(entries: readonly { date: string; sets: readonly SetV2[] | null }[], maxRepRows = 8): ExerciseBests {
  const out: ExerciseBests = { weight: null, e1rm: null, volume: null, reps: null, duration: null, repsAt: [] }
  const at = new Map<number, { reps: number; date: string }>()
  const better = (cur: BestRow | null, value: number, date: string, weight: number | null, reps: number | null): BestRow =>
    !cur || value > cur.value || (value === cur.value && date < cur.date) ? { value, date, weight, reps } : cur
  for (const e of entries) for (const s of e.sets ?? []) {
    if (!isWorking(s)) continue
    const w = s.weight ?? 0, r = s.reps ?? 0, d = s.duration ?? 0
    if (w > 0 && r > 0) {
      out.weight = better(out.weight, w, e.date, w, r)
      out.e1rm = better(out.e1rm, e1rm(w, r), e.date, w, r)
      out.volume = better(out.volume, w * r, e.date, w, r)
      const c = at.get(w)
      if (!c || r > c.reps || (r === c.reps && e.date < c.date)) at.set(w, { reps: r, date: e.date })
    }
    if (r > 0) out.reps = better(out.reps, r, e.date, w > 0 ? w : null, r)
    if (d > 0) out.duration = better(out.duration, d, e.date, null, null)
  }
  out.repsAt = [...at].map(([weight, v]) => ({ weight, ...v })).sort((a, b) => b.weight - a.weight).slice(0, maxRepRows)
  return out
}
