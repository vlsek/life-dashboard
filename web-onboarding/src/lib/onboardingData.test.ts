import { describe, it, expect } from 'vitest'
import { metricDescription, selectedMetrics, dayProgressSettingsFor, baseMetrics, goalMetrics } from './onboardingData'

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
  it('planner usecase always yields no metrics, regardless of goal', () => {
    expect(selectedMetrics('planner', 'en', 'gain_muscle', new Set())).toEqual([])
  })
  it('combines base + goal metrics, minus unchecked keys', () => {
    const out = selectedMetrics('goals', 'en', 'gain_muscle', new Set(['pushups', 'mood']))
    expect(out.map((m) => m.key)).toEqual(['water', 'study', 'calories', 'workout', 'protein'])
  })
  it('goals with no extra metrics (learn_skill) just uses base', () => {
    const out = selectedMetrics('both', 'en', 'learn_skill', new Set())
    expect(out).toHaveLength(baseMetrics('en').length)
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
