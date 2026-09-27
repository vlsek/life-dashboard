export type MetricType = 'boolean' | 'multiselect' | 'number' | 'sets'
export type GoalDirection = 'at_least' | 'at_most'

export interface Metric {
  id: string
  type: MetricType
  active: boolean
  goal_value: number | null
  goal_direction: GoalDirection | null
}

export interface SetEntry {
  reps?: number
}

export type MetricValue = boolean | string[] | number | SetEntry[] | null

export interface DailyValue {
  date: string
  metric_id: string
  value: MetricValue
}

export interface GoalRow {
  done: boolean
  points: number | null
}
export interface SkillRow {
  mastered: boolean
  points: number | null
}
export interface BookRow {
  status: string
  points: number | null
}

export interface ShopItem {
  id: string
  user_id: string
  name: string
  link: string | null
  cost: number
  image_url: string | null
  redeemed: boolean
  redeemed_date: string | null
}

export interface ShopItemFormInput {
  name: string
  link: string
  cost: number
  image_url: string | null
}
