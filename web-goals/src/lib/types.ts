import type { Horizon } from './horizons'
import type { WeightMode } from './weightGoal'

export type Difficulty = 'easy' | 'medium' | 'hard' | null

export interface Goal {
  id: string
  user_id: string
  name: string
  points: number
  category: string
  stages: number
  current_stage: number
  done: boolean
  done_date: string | null // ISO
  deadline: string | null // ISO, опционально (миграция 020)
  difficulty: Difficulty
  horizon?: Horizon | null // миграция 084; нет колонки/значения — выводится из срока (effectiveHorizon)
  weight_mode?: WeightMode | null // миграция 085: цель на вес («сбросить»/«набрать»); текущий вес — из body_stats
  weight_start?: number | null
  weight_target?: number | null
  repeat_every?: 'week' | 'month' | 'year' | null // миграция 120: повтор (BACKLOG 81.4); нет колонки/значения — не повторяется
  repeat_next_id?: string | null // созданная при выполнении следующая цель (не плодим дубликаты при повторной отметке)
  created_at: string
}

// Значения формы добавления/редактирования (до сборки в патч для базы). Баллов здесь НЕТ: они не вводятся, а считаются по сложности
// (решение владельца 2026-10-06, BACKLOG разделы 35/40) — см. pointsForDifficulty()/pointsAfterEdit() в goals.ts.
export interface GoalFormInput {
  name: string
  category: string
  stages: number
  difficulty: Difficulty
  deadline: string
  horizon?: Horizon | null
  weightMode?: WeightMode | null // цель на вес (миграция 085); null/нет — обычная цель
  weightStart?: number | null
  weightTarget?: number | null
  repeat?: 'week' | 'month' | 'year' | null // повтор цели (миграция 120)
}

// Начальные значения формы: то же + текущие баллы цели (только для показа строки «Баллы: N»; в базу из формы не уходят).
export interface GoalFormInitial extends GoalFormInput {
  points: number
}
