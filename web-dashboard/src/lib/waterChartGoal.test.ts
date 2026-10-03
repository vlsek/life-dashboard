import { describe, expect, it } from 'vitest'
import { buildSeries } from './chartSeries'
import { applyWaterGoal, autoNormFromBody } from './waterGoal'
import type { Metric } from './types'

// Линия цели по умолчанию на графике воды — эффективная норма, а не пусто (BACKLOG 14, «остаток после v1.92»).
const water = (goal: number | null = null): Metric => ({ id: 'w', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: goal, goal_direction: null, schedule: null, category_id: null, position: 1 })
const pushups: Metric = { ...water(), id: 'p', name: 'Отжимания', icon: '📌', unit: 'раз', goal_value: 50, position: 2 }
const values = [{ date: '2026-10-01', metric_id: 'w', value: 1800 }, { date: '2026-10-01', metric_id: 'p', value: 30 }]
const goalOf = (metrics: Metric[], key: string) => buildSeries([], [], metrics, values)[key].defaultGoal

describe('линия цели воды на графике', () => {
  it('без подстановки у воды с пустой нормой линии нет (было)', () => {
    expect(goalOf([water()], 'metric:w')).toBeNull()
  })
  it('с эффективной нормой: по весу и росту, без веса — 1800; ручная норма и другие метрики не меняются', () => {
    expect(goalOf(applyWaterGoal([water(), pushups], autoNormFromBody(80, 180)), 'metric:w')).toBe(autoNormFromBody(80, 180))
    expect(goalOf(applyWaterGoal([water(), pushups], null), 'metric:w')).toBe(1800)
    expect(goalOf(applyWaterGoal([water(1500), pushups], 2400), 'metric:w')).toBe(1500)
    expect(goalOf(applyWaterGoal([water(), pushups], 2400), 'metric:p')).toBe(50)
  })
})
