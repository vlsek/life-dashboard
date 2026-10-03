import type { LeaderboardRow } from './types'

// Период лидерборда: неделя / месяц / всё время (миграция 046, RPC get_leaderboard_period).
export type Period = 'week' | 'month' | 'all'
export const PERIODS: Period[] = ['week', 'month', 'all']

// Баллы приходят числом или строкой (numeric из PostgREST); дробные — с одним знаком, целые — без «.0».
export function formatPoints(n: number | string | null | undefined): string {
  const v = Number(n)
  if (!Number.isFinite(v)) return '0'
  const r = Math.round(v * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

// Инициалы для аватара-заглушки: до двух букв первых слов; пустое имя → «?».
export function initials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0]!.toUpperCase())
    .join('')
}

export interface PodiumSlot {
  rank: number // 1-based место
  row: LeaderboardRow
}

// Подиум: до трёх первых, порядок слева направо 2-е, 1-е, 3-е (первое по центру). Меньше трёх — только имеющиеся.
export function podiumSlots(rows: LeaderboardRow[]): PodiumSlot[] {
  const top = rows.slice(0, 3).map((row, i) => ({ rank: i + 1, row }))
  const order = [1, 0, 2]
  return order.map((i) => top[i]).filter((s): s is PodiumSlot => !!s)
}

// Остальные — списком с 4-го места.
export function restRows(rows: LeaderboardRow[]): { rank: number; row: LeaderboardRow }[] {
  return rows.slice(3).map((row, i) => ({ rank: i + 4, row }))
}

// Моё место и строка в текущем списке (null — меня в нём нет).
export function myPlace(rows: LeaderboardRow[], myId: string): { rank: number; row: LeaderboardRow } | null {
  const i = rows.findIndex((r) => r.user_id === myId)
  return i < 0 ? null : { rank: i + 1, row: rows[i]! }
}
