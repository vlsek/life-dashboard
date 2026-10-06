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
}

// Начальные значения формы: то же + текущие баллы цели (только для показа строки «Баллы: N»; в базу из формы не уходят).
export interface GoalFormInitial extends GoalFormInput {
  points: number
}
