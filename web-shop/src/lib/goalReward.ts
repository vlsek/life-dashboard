// BACKLOG 68.2 срез 1: «награда за выполнение цели». Чистая логика статуса хотелки, привязанной к цели из «Целей» (shop_items.goal_id, миграция 111).
// Правила те же, что в базе (триггер shop_items_goal_guard): цель считается выполненной как на сервере (goal_is_done) и как в «Календаре»/«Истории»:
// stages ≤ 1 → флаг done, иначе current_stage ≥ stages. Вещь «за цель» ничего не стоит — ни огоньков, ни монет.
import { t } from './i18n'

export interface GoalLite {
  id: string
  name: string
  stages?: number | null
  current_stage?: number | null
  done?: boolean | null
}

export interface RewardItemLite {
  goal_id?: string | null
  redeemed?: boolean | null
}

export function goalIsDone(g: GoalLite): boolean {
  const stages = g.stages ?? 1
  return stages <= 1 ? !!g.done : (g.current_stage ?? 0) >= stages
}

// Полоса этапов «3 из 5»: у одноэтапной цели — 0 из 1 или 1 из 1
export function goalProgress(g: GoalLite): { done: number; total: number } {
  const total = Math.max(1, g.stages ?? 1)
  if (goalIsDone(g)) return { done: total, total }
  return { done: Math.min(total - 1, Math.max(0, g.current_stage ?? 0)), total }
}

// Цели, которые можно привязать к хотелке: только ещё НЕ выполненные (иначе готовая цель дала бы награду даром); незавершённые — по алфавиту
export function selectableGoals(goals: GoalLite[]): GoalLite[] {
  return goals.filter((g) => !goalIsDone(g)).sort((a, b) => a.name.localeCompare(b.name))
}

// no_goal — обычная хотелка (за огоньки); in_progress — цель ещё не выполнена; ready — цель выполнена, награду можно забрать;
// claimed — награда получена; goal_missing — цель привязана, но её нет в списке (удалена: хотелка вернётся «за огоньки»)
export type RewardStatus = 'no_goal' | 'goal_missing' | 'in_progress' | 'ready' | 'claimed'

export interface RewardState {
  status: RewardStatus
  goal: GoalLite | null
  progress: { done: number; total: number } | null
}

export function rewardState(item: RewardItemLite, goals: GoalLite[]): RewardState {
  if (item.redeemed) return { status: 'claimed', goal: null, progress: null }
  if (!item.goal_id) return { status: 'no_goal', goal: null, progress: null }
  const goal = goals.find((g) => g.id === item.goal_id) ?? null
  if (!goal) return { status: 'goal_missing', goal: null, progress: null }
  return { status: goalIsDone(goal) ? 'ready' : 'in_progress', goal, progress: goalProgress(goal) }
}

// Коды ошибок миграции 111 (errcode) → понятный текст; null — это не наша ошибка (показываем общим friendlyError)
const GR_KEYS = {
  GR001: 'gr_err_goal_missing',
  GR002: 'gr_err_goal_done',
  GR003: 'gr_err_goal_not_done',
  GR004: 'gr_err_claimed',
  GR005: 'gr_err_not_found',
  GR006: 'gr_err_claimed',
} as const

export function goalRewardErrorText(err: unknown): string | null {
  const e = (err && typeof err === 'object' ? err : {}) as { code?: unknown; message?: unknown }
  const code = String(e.code ?? '')
  if (code in GR_KEYS) return t(GR_KEYS[code as keyof typeof GR_KEYS])
  return null
}
