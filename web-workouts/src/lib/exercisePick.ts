// Выбор упражнения в активной тренировке (BACKLOG 69.13, срез 1): недавние и частые — сверху, поиск по названию (регистр не важен, «ё» = «е»).
import type { Exercise } from './types'

export interface PickRow { exercise: Exercise; last: string | null; count: number }
const norm = (s: string): string => s.toLowerCase().replace(/ё/g, 'е').trim()

export function rankExercises(exercises: readonly Exercise[], entries: readonly { exercise_id: string; date: string }[], query: string, category: string | null = null, muscle: string | null = null): PickRow[] {
  const last = new Map<string, string>(), count = new Map<string, number>()
  for (const e of entries) {
    if ((last.get(e.exercise_id) ?? '') < e.date) last.set(e.exercise_id, e.date)
    count.set(e.exercise_id, (count.get(e.exercise_id) ?? 0) + 1)
  }
  const q = norm(query)
  return exercises
    .filter((e) => (!q || norm(e.name).includes(q)) && (category == null || (e.category ?? '') === category) && (muscle == null || (e.muscle_groups ?? []).includes(muscle)))
    .map((exercise) => ({ exercise, last: last.get(exercise.id) ?? null, count: count.get(exercise.id) ?? 0 }))
    .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? '') || b.count - a.count || a.exercise.name.localeCompare(b.exercise.name))
}

// Категории для чипов-фильтров: только непустые, без повторов, по алфавиту
export const categoriesOf = (exercises: readonly Exercise[]): string[] =>
  [...new Set(exercises.map((e) => (e.category ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))

// Мышцы для чипов-фильтров: только те, что есть у упражнений; порядок — по числу упражнений, затем по id
export const musclesOf = (exercises: readonly Exercise[]): string[] => {
  const n = new Map<string, number>()
  for (const e of exercises) for (const m of new Set(e.muscle_groups ?? [])) n.set(m, (n.get(m) ?? 0) + 1)
  return [...n.keys()].sort((a, b) => (n.get(b) ?? 0) - (n.get(a) ?? 0) || a.localeCompare(b))
}
