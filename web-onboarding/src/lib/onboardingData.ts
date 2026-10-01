import type { BodyParamKey, GoalType, LayoutItem, MetricTemplate, Usecase } from './types'

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

// Все метрики, из которых человек может выбрать (базовые + под цель; для «ежедневника» метрик нет вовсе).
export function candidateMetrics(usecase: Usecase, lang: 'en' | 'ru', goal: GoalType): MetricTemplate[] {
  if (usecase === 'planner') return []
  return [...baseMetrics(lang), ...goalMetrics(lang, goal)]
}

// BACKLOG 8.3: новому пользователю не навязываем всё подряд — по цели предвыбраны только подходящие метрики,
// остальные доступны по желанию (и всегда добавляются позже на главной).
const RECOMMENDED: Record<GoalType, string[]> = {
  lose_weight: ['water', 'calories', 'steps', 'workout'],
  gain_muscle: ['pushups', 'protein', 'workout', 'water'],
  learn_skill: ['study', 'mood'],
  general_fitness: ['water', 'workout', 'mood'],
}

export function recommendedKeys(goal: GoalType): string[] {
  return [...RECOMMENDED[goal]]
}

// Делит кандидатов на «рекомендуем под цель» и «остальные» (порядок внутри групп — как в списке кандидатов).
export function metricGroups(usecase: Usecase, lang: 'en' | 'ru', goal: GoalType): { recommended: MetricTemplate[]; other: MetricTemplate[] } {
  const all = candidateMetrics(usecase, lang, goal)
  const rec = new Set(RECOMMENDED[goal])
  return { recommended: all.filter((m) => rec.has(m.key)), other: all.filter((m) => !rec.has(m.key)) }
}

// Какие метрики реально уйдут в базу: выбранные человеком среди кандидатов (для «ежедневника» — пусто).
export function selectedMetrics(usecase: Usecase, lang: 'en' | 'ru', goal: GoalType, selectedKeys: ReadonlySet<string>): MetricTemplate[] {
  return candidateMetrics(usecase, lang, goal).filter((m) => selectedKeys.has(m.key))
}

// «Пропустить, настрою сам»: не шесть метрик, а две универсальные — чтобы главная не была пустой, но и не была завалена.
export function starterMetrics(lang: 'en' | 'ru'): MetricTemplate[] {
  return baseMetrics(lang).filter((m) => m.key === 'water' || m.key === 'workout')
}

// Параметры тела: «ежедневнику» не нужны вовсе; остальным — вес, а при цели «похудеть»/«набрать» ещё % жира и мышцы.
// Вода в теле по умолчанию больше не создаётся (её можно добавить позже вручную).
export function bodyParamKeysFor(usecase: Usecase, goal: GoalType | null): BodyParamKey[] {
  if (usecase === 'planner') return []
  if (goal === 'lose_weight' || goal === 'gain_muscle') return ['weight', 'fat', 'muscle']
  return ['weight']
}

// Раскладка Дашборда (profiles.dashboard_layout, ключи как в Дашборде): «ежедневнику» не нужны графики метрик.
export function layoutFor(usecase: Usecase): LayoutItem[] | null {
  if (usecase !== 'planner') return null
  return [
    { key: 'profile', visible: true },
    { key: 'charts', visible: false },
    { key: 'daily', visible: true },
  ]
}

// Шаги мастера: «ежедневнику» нужны только выбор сценария и «о себе».
export type StepId = 'usecase' | 'about' | 'priority' | 'metrics'
export function stepsFor(usecase: Usecase): StepId[] {
  return usecase === 'planner' ? ['usecase', 'about'] : ['usecase', 'about', 'priority', 'metrics']
}

// Портировано из submitBtn.onclick(): настройка диаграммы дня по умолчанию под сценарий.
export function dayProgressSettingsFor(usecase: Usecase) {
  if (usecase === 'planner') return { enabled: true, includePlanned: true, includeMetrics: false }
  if (usecase === 'goals') return { enabled: true, includePlanned: false, includeMetrics: true }
  return { enabled: true, includePlanned: true, includeMetrics: true }
}
