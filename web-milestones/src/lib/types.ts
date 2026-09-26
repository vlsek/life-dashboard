// 1:1 со схемой таблицы milestones (см. migrations/022_milestones.sql в корне репозитория).
export type IntervalUnit = 'day' | 'week' | 'month' | 'year'

export interface MilestoneHistoryEntry {
  date: string // ISO
  km: number | null
  note: string | null
}

export interface Milestone {
  id: string
  user_id: string
  name: string
  category: string
  last_date: string | null // ISO
  interval_value: number | null
  interval_unit: IntervalUnit | null
  due_date: string | null // ISO
  last_km: number | null
  interval_km: number | null
  note: string | null
  history: MilestoneHistoryEntry[]
  done: boolean
  created_at: string
}

// Значения формы редактирования/создания (до сборки в строку для базы — см. buildRow).
export interface MilestoneFormInput {
  name: string
  category: string
  last_date: string
  interval_value: number
  interval_unit: IntervalUnit
  due_date: string
  last_km: number
  interval_km: number
  note: string
}
