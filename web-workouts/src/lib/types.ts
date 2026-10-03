import type { MuscleId } from './muscles'
export interface WorkoutSet {
  reps: number | null
  weight: number | null
  time: string | null
  duration: number | null
  side: 'L' | 'R' | null
}

export interface Exercise {
  id: string
  user_id: string
  name: string
  category: string | null
  tracks_weight: boolean
  value_label: string | null
  unit: string | null
  suggested_scheme: string | null
  // Появились в миграциях 027/028 — у старых записей может отсутствовать поле целиком.
  tracks_duration?: boolean
  bilateral?: boolean
  created_at: string
}

export interface WorkoutEntry {
  id: string
  user_id: string
  exercise_id: string
  date: string
  sets: WorkoutSet[]
  notes: string | null
}

export interface ExerciseFormInput {
  name: string
  category: string
  tracks_weight: 'yes' | 'no'
  value_label: string
  unit: string
  tracks_duration: boolean
  bilateral: boolean
  // Свои группы мышц для карты мышц (BACKLOG 22 «12:33»): undefined — не менять, [] — убрать свою привязку (снова авто), список — задать.
  muscles?: MuscleId[]
}

export interface EntryFormInput {
  date: string
  sets: WorkoutSet[]
  notes: string | null
}

export interface WorkoutTemplateExercise {
  name: string
  tracksWeight: boolean
  valueLabel: string
  scheme: string
}
export interface WorkoutTemplateDay {
  label: string
  exercises: WorkoutTemplateExercise[]
}
export interface WorkoutTemplate {
  id: string
  title: string
  goalTag: string
  meta: string
  days: WorkoutTemplateDay[]
  // Прогрессивные программы (BACKLOG 3.3): нагрузка по неделям. В упражнение при добавлении попадает
  // схема первой недели (`days`), остальные недели показываются в предпросмотре шаблона.
  weeks?: WorkoutTemplateWeek[]
}
export interface WorkoutTemplateWeek {
  label: string
  scheme: string
}
