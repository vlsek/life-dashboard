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
