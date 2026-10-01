import { describe, it, expect } from 'vitest'
import { baseMetrics, metricDescription, selectedMetrics, dayProgressSettingsFor, goalMetrics, recommendedKeys, metricGroups, starterMetrics, bodyParamKeysFor, layoutFor, stepsFor, candidateMetrics } from './onboardingData'

const labels = { bool: 'yes/no', multiselect: 'choice from options', lessThan: 'less than', atLeast: 'at least' }

describe('metricDescription', () => {
  it('boolean/multiselect get fixed captions', () => {
    expect(metricDescription({ type: 'boolean' }, labels)).toBe('yes/no')
    expect(metricDescription({ type: 'multiselect' }, labels)).toBe('choice from options')
  })
  it('number metrics show direction + goal + unit', () => {
    expect(metricDescription({ type: 'number', goal_direction: 'at_least', goal_value: 100, unit: '' }, labels)).toBe('at least 100')
    expect(metricDescription({ type: 'number', goal_direction: 'at_most', goal_value: 2000, unit: 'kcal' }, labels)).toBe('less than 2000 kcal')
  })
})

describe('selectedMetrics', () => {
  it('planner usecase always yields no metrics, regardless of goal or selection', () => {
    expect(selectedMetrics('planner', 'en', 'gain_muscle', new Set(['pushups', 'water']))).toEqual([])
  })
  it('returns only the selected candidates, in candidate order', () => {
    const out = selectedMetrics('goals', 'en', 'gain_muscle', new Set(['protein', 'water', 'pushups']))
    expect(out.map((m) => m.key)).toEqual(['pushups', 'water', 'protein'])
  })
  it('ignores selected keys that are not candidates for this goal', () => {
    expect(selectedMetrics('both', 'en', 'learn_skill', new Set(['protein', 'steps', 'study'])).map((m) => m.key)).toEqual(['study'])
  })
  it('nothing selected means no metrics at all', () => {
    expect(selectedMetrics('goals', 'en', 'lose_weight', new Set())).toEqual([])
  })
})

describe('recommendations (BACKLOG 8.3: no clutter after sign-up)', () => {
  it('every recommended key is a real candidate for that goal', () => {
    for (const goal of ['lose_weight', 'gain_muscle', 'learn_skill', 'general_fitness'] as const) {
      const keys = candidateMetrics('goals', 'en', goal).map((m) => m.key)
      for (const k of recommendedKeys(goal)) expect(keys).toContain(k)
    }
  })
  it('recommendations are a small subset, never the whole list', () => {
    for (const goal of ['lose_weight', 'gain_muscle', 'learn_skill', 'general_fitness'] as const) {
      const all = candidateMetrics('goals', 'en', goal).length
      expect(recommendedKeys(goal).length).toBeGreaterThan(0)
      expect(recommendedKeys(goal).length).toBeLessThan(all)
    }
  })
  it('metricGroups splits candidates without losing or duplicating any', () => {
    const g = metricGroups('goals', 'ru', 'lose_weight')
    expect(g.recommended.map((m) => m.key)).toEqual(['water', 'calories', 'workout', 'steps']) // порядок как в списке кандидатов
    expect(g.other.map((m) => m.key)).toEqual(['pushups', 'study', 'mood'])
    expect(g.recommended.length + g.other.length).toBe(candidateMetrics('goals', 'ru', 'lose_weight').length)
  })
  it('planner has no metric groups', () => {
    expect(metricGroups('planner', 'en', 'lose_weight')).toEqual({ recommended: [], other: [] })
  })
})

describe('starterMetrics (skip)', () => {
  it('two universal metrics instead of all six', () => {
    expect(starterMetrics('en').map((m) => m.key)).toEqual(['water', 'workout'])
    expect(starterMetrics('ru').map((m) => m.key)).toEqual(['water', 'workout'])
  })
})

describe('bodyParamKeysFor', () => {
  it('planner gets no body parameters', () => {
    expect(bodyParamKeysFor('planner', null)).toEqual([])
    expect(bodyParamKeysFor('planner', 'lose_weight')).toEqual([])
  })
  it('weight-related goals get weight + fat + muscle, the rest only weight; body water is never default', () => {
    expect(bodyParamKeysFor('goals', 'lose_weight')).toEqual(['weight', 'fat', 'muscle'])
    expect(bodyParamKeysFor('both', 'gain_muscle')).toEqual(['weight', 'fat', 'muscle'])
    expect(bodyParamKeysFor('goals', 'learn_skill')).toEqual(['weight'])
    expect(bodyParamKeysFor('goals', 'general_fitness')).toEqual(['weight'])
  })
})

describe('layoutFor / stepsFor', () => {
  it('planner hides the metric charts block, the others keep the default layout', () => {
    expect(layoutFor('planner')).toEqual([
      { key: 'profile', visible: true },
      { key: 'charts', visible: false },
      { key: 'daily', visible: true },
    ])
    expect(layoutFor('goals')).toBeNull()
    expect(layoutFor('both')).toBeNull()
  })
  it('planner finishes after "about you", everybody else goes through priority and metrics', () => {
    expect(stepsFor('planner')).toEqual(['usecase', 'about'])
    expect(stepsFor('goals')).toEqual(['usecase', 'about', 'priority', 'metrics'])
    expect(stepsFor('both')).toEqual(['usecase', 'about', 'priority', 'metrics'])
  })
})

describe('dayProgressSettingsFor', () => {
  it('planner: plan only, no metrics', () => {
    expect(dayProgressSettingsFor('planner')).toEqual({ enabled: true, includePlanned: true, includeMetrics: false })
  })
  it('goals: metrics only, no plan', () => {
    expect(dayProgressSettingsFor('goals')).toEqual({ enabled: true, includePlanned: false, includeMetrics: true })
  })
  it('both: everything', () => {
    expect(dayProgressSettingsFor('both')).toEqual({ enabled: true, includePlanned: true, includeMetrics: true })
  })
})

describe('goalMetrics', () => {
  it('lose_weight/gain_muscle add one extra metric, the rest are empty', () => {
    expect(goalMetrics('en', 'lose_weight').map((m) => m.key)).toEqual(['steps'])
    expect(goalMetrics('en', 'gain_muscle').map((m) => m.key)).toEqual(['protein'])
    expect(goalMetrics('en', 'learn_skill')).toEqual([])
    expect(goalMetrics('en', 'general_fitness')).toEqual([])
  })
})

describe('вода: норма считается автоматически (BACKLOG 17)', () => {
  it('шаблон воды создаётся без goal_value — иначе справка пишет «задана вручную» и расчёт по весу не включается', () => {
    for (const lang of ['en', 'ru'] as const) {
      const water = baseMetrics(lang).find((m) => m.key === 'water')!
      expect(water.goal_value).toBeUndefined()
      expect(water.goal_direction).toBe('at_least')
    }
  })

  it('описание метрики без нормы — «считается по весу», у остальных по-прежнему «не меньше N»', () => {
    const labels = { bool: 'yes/no', multiselect: 'options', lessThan: 'under', atLeast: 'at least', auto: 'auto by weight' }
    expect(metricDescription({ type: 'number', goal_direction: 'at_least', goal_value: undefined, unit: 'ml' }, labels)).toBe('auto by weight')
    expect(metricDescription({ type: 'number', goal_direction: 'at_least', goal_value: 100, unit: '' }, labels)).toBe('at least 100')
  })
})
