import type { Goal } from './types'

// BACKLOG 81.4 «Повторяющиеся цели»: правило повтора и расчёт следующей цели. Чистая логика, без сети (сеть — useGoals.ts).
export type Repeat = 'week' | 'month' | 'year'
export const REPEATS: readonly Repeat[] = ['week', 'month', 'year']

export function normalizeRepeat(v: unknown): Repeat | null {
  return v === 'week' || v === 'month' || v === 'year' ? v : null
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate() // m: 1..12

// k-й следующий срок от base: день месяца сохраняется от base (31-е в коротком месяце — последний день, но не «съезжает» дальше).
export function nthDeadline(base: string, every: Repeat, k: number): string {
  const [y, m, d] = base.split('-').map(Number)
  if (every === 'week') {
    const dt = new Date(y, m - 1, d + 7 * k)
    return iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
  }
  if (every === 'month') {
    const idx = y * 12 + (m - 1) + k
    const ny = Math.floor(idx / 12)
    const nm = (idx % 12) + 1
    return iso(ny, nm, Math.min(d, daysIn(ny, nm)))
  }
  const ny = y + k
  return iso(ny, m, Math.min(d, daysIn(ny, m)))
}

// Срок следующей цели: от срока выполненной (нет срока — от сегодня); если он уже в прошлом (счёт оплатили с опозданием больше периода) — ближайший будущий.
export function nextDeadline(g: Pick<Goal, 'deadline'>, every: Repeat, today: string): string {
  const base = g.deadline || today
  let k = 1
  let next = nthDeadline(base, every, k)
  while (next < today && k < 2000) next = nthDeadline(base, every, ++k)
  return next
}

// Цели на вес не повторяем (у них свой жизненный цикл по весу).
export function canRepeat(g: Pick<Goal, 'weight_mode'>): boolean {
  return !g.weight_mode
}

// Строка для вставки следующей цели: копия без прогресса. Необязательные колонки (difficulty, horizon) копируем, только если они есть у исходной.
export function buildNextRow(g: Goal, today: string): Record<string, unknown> {
  const every = normalizeRepeat(g.repeat_every)
  if (!every) throw new Error('goal is not repeating')
  const row: Record<string, unknown> = {
    user_id: g.user_id,
    name: g.name,
    points: g.points,
    category: g.category,
    stages: g.stages,
    current_stage: 0,
    done: false,
    deadline: nextDeadline(g, every, today),
    repeat_every: every,
  }
  if ('difficulty' in g) row.difficulty = g.difficulty
  if ('horizon' in g) row.horizon = 'day'
  return row
}
