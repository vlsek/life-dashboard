export type MetricType = 'boolean' | 'number' | 'sets' | 'multiselect'
export type GoalDirection = 'at_least' | 'at_most'

export type Schedule =
  | null
  | { type: 'days'; days: number[] } // 0 = воскресенье, как Date.getDay()
  | { type: 'weekly'; min: number }
  | { type: 'at_most'; max: number }

export interface Metric {
  id: string
  user_id: string
  name: string
  icon: string | null
  type: MetricType
  unit: string | null
  goal_value: number | null
  goal_direction: GoalDirection | null
  schedule: Schedule
  category_id: string | null
  position: number
  streak_import_days?: number | null
  streak_import_date?: string | null
  // Поля ниже нужны блоку «Управление метриками» (multiselect/sets и режим ввода числа)
  options?: MetricOption[] | null
  input_mode?: 'set' | 'add' | null
}

export interface MetricOption {
  key: string
  label: string
}

export type SetEntry = { reps?: number; weight?: number; time?: string }

// Значение daily_values.value — тип зависит от metric.type
export type MetricValue = boolean | number | string[] | SetEntry[] | null | undefined

export interface DailyValueRow {
  date: string
  metric_id: string
  value: MetricValue
}
