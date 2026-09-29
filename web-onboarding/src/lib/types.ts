export type MetricType = 'boolean' | 'multiselect' | 'number'
export type GoalDirection = 'at_least' | 'at_most'
export type Usecase = 'goals' | 'planner' | 'both'
export type GoalType = 'lose_weight' | 'gain_muscle' | 'learn_skill' | 'general_fitness'

export interface MultiselectOption {
  key: string
  label: string
}

export interface MetricTemplate {
  key: string
  name: string
  icon: string
  type: MetricType
  goal_value?: number
  goal_direction?: GoalDirection
  unit?: string
  options?: MultiselectOption[]
}

export interface OnboardingAnswers {
  gender: 'male' | 'female'
  birthdate: string | null
  height: number | null
  weight: number | null
  goal_type: GoalType | null
  skills_raw: string
  selectedMetrics: MetricTemplate[]
}
