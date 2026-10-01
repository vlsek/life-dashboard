export type ChallengeType = 'daily_fixed' | 'daily_progressive' | 'daily_boolean' | 'cumulative_count'

export interface Challenge {
  id: string
  user_id: string
  template_id: string | null
  title: string
  icon: string
  type: ChallengeType
  unit: string | null
  start_date: string // date (YYYY-MM-DD)
  duration_days: number | null
  daily_target: number | null
  start_value: number | null
  daily_increment: number | null
  target_count: number | null
  item_label: string | null
  active: boolean
  completed: boolean
  completed_at: string | null // ISO timestamp
  // Миграция 032: метрика-источник значений дней. Колонки может ещё не быть (тогда поля нет вовсе).
  source_metric_id?: string | null
  created_at: string
}

export interface ChallengeEntry {
  id: string
  user_id: string
  challenge_id: string
  date: string // date
  value: number | null
  note: string | null
  created_at: string
}

export interface ChallengeTemplate {
  id: string
  icon: string
  title: string
  description: string
  type: ChallengeType
  durationDays?: number
  dailyTarget?: number
  startValue?: number
  dailyIncrement?: number
  targetCount?: number
  itemLabel?: string
  unit?: string
}

// Значения формы "Свой челлендж" (до сборки в патч для базы) — портировано из
// openCustomChallengeModal() в challenges.js.
export interface CustomChallengeFormInput {
  title: string
  icon: string
  type: ChallengeType
  duration: number
  dailyTarget: number
  startValue: number
  increment: number
  unit: string
  targetCount: number
  itemLabel: string
  // id метрики-источника ('' или не задано — вводить вручную)
  sourceMetricId?: string
}

// Метрика пользователя, из которой челлендж может брать значения дней (BACKLOG 14, «11:28»).
export interface SourceMetric {
  id: string
  name: string
  icon: string | null
  type: string
  unit: string | null
}
