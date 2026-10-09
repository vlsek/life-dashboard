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
  // пропущенные дни (BACKLOG 47.3, миграция 061): метрика в эти даты «не нужна» — серию не рвёт и не растит
  skipped_days?: string[] | null
  category_id: string | null
  position: number
  streak_import_days?: number | null
  streak_import_date?: string | null
  // Миграция 031: false — серию по метрике не считаем и в «идеальный день» она не входит (вес и т.п.)
  count_streak?: boolean | null
  // Миграция 041: «сколько подходов планируется в день» (только для типа sets) — ЖУРНАЛ изменений по возрастанию дат:
  // [{ from: '2026-10-01', n: 3 }, { from: '2026-10-10', n: 4 }]; n = null — параметр снят с этой даты. С даты from метрика
  // выполнена при n и более подходах (и общем объёме goal_value, если он задан); ДО первой записи — по прежнему правилу
  // (решение владельца 2026-10-03: прошлые дни не пересчитываем, баланс не должен «прыгать» ни при включении, ни при смене N)
  planned_sets_log?: PlannedSetsEntry[] | null
  // Поля ниже нужны блоку «Управление метриками» (multiselect/sets и режим ввода числа)
  options?: MetricOption[] | null
  input_mode?: 'set' | 'add' | null
}

export interface PlannedSetsEntry {
  from: string
  n: number | null
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

// ---- Только для страницы «Достижения» ----
// Минимальные формы строк, из которых считаются счётчики (лишние колонки не нужны).
export interface PointsRow {
  points: number | null
}
