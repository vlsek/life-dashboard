export type MetricType = 'boolean' | 'number' | 'multiselect' | 'sets'
export type GoalDirection = 'at_least' | 'at_most' | null

export interface MetricSchedule {
  type: 'days' | 'weekly' | 'at_most'
  days?: number[]
  min?: number
  max?: number
}

export interface MetricOption {
  key?: string
  label: string
}

export interface Metric {
  id: string
  name: string
  icon: string
  type: MetricType
  unit?: string | null
  goal_value?: number | null
  goal_direction?: GoalDirection
  options?: MetricOption[] | null
  schedule?: MetricSchedule | null
}

export interface SetEntry {
  reps?: number
  weight?: number | null
  time?: string | null
  duration?: number | null
  side?: 'L' | 'R' | null
}

// Значение метрики за день: boolean | number | string[] (multiselect) | SetEntry[] (sets)
export type MetricValue = boolean | number | string[] | SetEntry[] | null | undefined

export type PlannedItem = {
  type: 'custom' | 'goal'
  text: string
  done?: boolean
  bonus?: boolean
}

export interface DailyNote {
  date: string
  items?: (string | { text: string })[]
  planned_goals?: (string | PlannedItem)[]
}

export interface Goal {
  name: string
  stages?: number | null
  done?: boolean | null
  current_stage?: number | null
}

export interface DayProgressSettings {
  enabled: boolean
  includePlanned: boolean
  includeMetrics: boolean
  dayPlace: 'avatar' | 'header' | 'off'
  weekPlace: 'profile' | 'header' | 'off'
}

export interface StatResult {
  done: number
  total: number
  bonusPct: number
  pct: number
}
