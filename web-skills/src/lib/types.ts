export interface Skill {
  id: string
  user_id: string
  name: string
  progress: number
  mastered: boolean
  step: number
  points: number
  created_at: string
}

export interface SkillFormInput {
  name: string
  step: number
  points: number
}

export type BookStatus = 'to_read' | 'done'

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  points: number
  status: BookStatus
  done_date: string | null // ISO
  created_at: string
}

export interface BookFormInput {
  title: string
  author: string
  points: number
}
