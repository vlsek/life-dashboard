import type { GoalType, MetricTemplate, Usecase } from './types'

// Портировано 1:1 из onboarding.js (BASE_METRICS_RU/EN, GOAL_METRICS_RU/EN, GOAL_OPTIONS_RU/EN).

export function goalOptions(lang: 'en' | 'ru'): { value: GoalType; label: string }[] {
  if (lang === 'en')
    return [
      { value: 'lose_weight', label: 'Lose weight' },
      { value: 'gain_muscle', label: 'Build muscle / gain mass' },
      { value: 'learn_skill', label: 'Learn specific skills' },
      { value: 'general_fitness', label: 'Just stay in shape / no specific goal' },
    ]
  return [
    { value: 'lose_weight', label: 'Похудеть' },
    { value: 'gain_muscle', label: 'Накачаться / набрать мышечную массу' },
    { value: 'learn_skill', label: 'Освоить конкретные навыки' },
    { value: 'general_fitness', label: 'Просто быть в форме / без конкретной цели' },
  ]
}

export function baseMetrics(lang: 'en' | 'ru'): MetricTemplate[] {
  if (lang === 'en')
    return [
      { key: 'pushups', name: 'Push-ups', icon: '💪', type: 'number', goal_value: 100, goal_direction: 'at_least', unit: '' },
      { key: 'water', name: 'Water', icon: '💧', type: 'number', goal_value: 2500, goal_direction: 'at_least', unit: 'ml' },
      { key: 'study', name: 'Study', icon: '📚', type: 'number', goal_value: 30, goal_direction: 'at_least', unit: 'min' },
      { key: 'calories', name: 'Calories', icon: '🍽️', type: 'number', goal_value: 2000, goal_direction: 'at_most', unit: 'kcal' },
      { key: 'mood', name: 'Good mood / peace in relationships', icon: '❤️', type: 'boolean' },
      {
        key: 'workout',
        name: 'Workout',
        icon: '🏋️',
        type: 'multiselect',
        options: [
          { key: 'run', label: '🚶 Walk/run' },
          { key: 'gym', label: '🏋️ Gym' },
          { key: 'stretch', label: '🤸 Stretching' },
          { key: 'rope', label: '🪢 Jump rope' },
          { key: 'swim', label: '🏊 Swimming' },
          { key: 'youtube', label: '📺 YouTube workout' },
        ],
      },
    ]
  return [
    { key: 'pushups', name: 'Отжимания', icon: '💪', type: 'number', goal_value: 100, goal_direction: 'at_least', unit: '' },
    { key: 'water', name: 'Вода', icon: '💧', type: 'number', goal_value: 2500, goal_direction: 'at_least', unit: 'мл' },
    { key: 'study', name: 'Учёба', icon: '📚', type: 'number', goal_value: 30, goal_direction: 'at_least', unit: 'мин' },
    { key: 'calories', name: 'Калории', icon: '🍽️', type: 'number', goal_value: 2000, goal_direction: 'at_most', unit: 'ккал' },
    { key: 'mood', name: 'Хорошее настроение / мир в отношениях', icon: '❤️', type: 'boolean' },
    {
      key: 'workout',
      name: 'Тренировка',
      icon: '🏋️',
      type: 'multiselect',
      options: [
        { key: 'run', label: '🚶 Ходьба/бег' },
        { key: 'gym', label: '🏋️ Зал' },
        { key: 'stretch', label: '🤸 Стретчинг' },
        { key: 'rope', label: '🪢 Скакалка' },
        { key: 'swim', label: '🏊 Плаванье' },
        { key: 'youtube', label: '📺 Ютуб-тренировка' },
      ],
    },
  ]
}

export function goalMetrics(lang: 'en' | 'ru', goal: GoalType): MetricTemplate[] {
  const ru: Record<GoalType, MetricTemplate[]> = {
    lose_weight: [{ key: 'steps', name: 'Шаги', icon: '🚶', type: 'number', goal_value: 8000, goal_direction: 'at_least', unit: '' }],
    gain_muscle: [{ key: 'protein', name: 'Белок', icon: '🥩', type: 'number', goal_value: 120, goal_direction: 'at_least', unit: 'г' }],
    learn_skill: [],
    general_fitness: [],
  }
  const en: Record<GoalType, MetricTemplate[]> = {
    lose_weight: [{ key: 'steps', name: 'Steps', icon: '🚶', type: 'number', goal_value: 8000, goal_direction: 'at_least', unit: '' }],
    gain_muscle: [{ key: 'protein', name: 'Protein', icon: '🥩', type: 'number', goal_value: 120, goal_direction: 'at_least', unit: 'g' }],
    learn_skill: [],
    general_fitness: [],
  }
  return (lang === 'en' ? en : ru)[goal]
}

// Портировано из metricDescription() в onboarding.js.
export function metricDescription(m: Pick<MetricTemplate, 'type' | 'goal_direction' | 'goal_value' | 'unit'>, labels: { bool: string; multiselect: string; lessThan: string; atLeast: string }): string {
  if (m.type === 'boolean') return labels.bool
  if (m.type === 'multiselect') return labels.multiselect
  const prefix = m.goal_direction === 'at_most' ? labels.lessThan : labels.atLeast
  return `${prefix} ${m.goal_value}${m.unit ? ' ' + m.unit : ''}`
}

// Портировано из submitBtn.onclick(): какие метрики реально уйдут в базу — кандидаты
// (базовые + под цель, или пусто для "ежедневника") минус снятые галочки.
export function selectedMetrics(usecase: Usecase, lang: 'en' | 'ru', goal: GoalType, uncheckedKeys: Set<string>): MetricTemplate[] {
  if (usecase === 'planner') return []
  const candidates = [...baseMetrics(lang), ...goalMetrics(lang, goal)]
  return candidates.filter((m) => !uncheckedKeys.has(m.key))
}

// Портировано из submitBtn.onclick(): настройка диаграммы дня по умолчанию под сценарий.
export function dayProgressSettingsFor(usecase: Usecase) {
  if (usecase === 'planner') return { enabled: true, includePlanned: true, includeMetrics: false }
  if (usecase === 'goals') return { enabled: true, includePlanned: false, includeMetrics: true }
  return { enabled: true, includePlanned: true, includeMetrics: true }
}
