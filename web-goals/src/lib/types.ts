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

// Значения формы добавления/редактирования (до сборки в патч для базы).
export interface GoalFormInput {
  name: string
  points: number
  category: string
  stages: number
  difficulty: Difficulty
  deadline: string
}
