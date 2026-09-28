export interface FollowedProfile {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

export interface LeaderboardRow {
  user_id: string
  display_name: string
  avatar_url: string | null
  total_points: number
  perfect_streak: number
  leaderboard_visible: boolean | null
}

export interface TodayActivityRow {
  user_id: string
  display_name: string
  avatar_url: string | null
  today_points: number
  items: string[] | null
  notes: string | null // легаси-записи до перехода на список пунктов
  leaderboard_visible: boolean | null
}

export type Scope = 'everyone' | 'friends'

export interface PublicProfile {
  display_name: string | null
  leaderboard_visible: boolean | null
}

// ---- Сравнение по активностям ----
export interface MetricCategory {
  id: string
  key: string
  label_ru: string
  label_en: string
}

export interface CategoryLeaderboardRow {
  user_id: string
  display_name: string
  avatar_url: string | null
  total_value: number
  category_points: number
  category_streak: number
  leaderboard_visible: boolean | null
}

export type CategoryMode = 'value' | 'points' | 'streak'
export type CategoryRange = 'week' | 'last_week' | 'month' | 'all'

export interface NumberMetric {
  id: string
  name: string
  icon: string | null
  category_id: string | null
  goal_value: number | null
}

export interface DailyValueRaw {
  date: string
  value: unknown
}
